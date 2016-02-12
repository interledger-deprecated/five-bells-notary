'use strict'

const crypto = require('crypto')
const co = require('co')
const request = require('co-request')
const tweetnacl = require('tweetnacl')
const makeCaseAttestation = require('five-bells-shared/utils/makeCaseAttestation')
const NotificationScheduler = require('five-bells-shared').NotificationScheduler
const UriManager = require('./uri')
const Log = require('./log')
const config = require('./config')
const NotificationFactory = require('../models/db/notification')
const CaseFactory = require('../models/db/case')
const knex = require('../lib/knex').knex

class NotificationWorker {
  static constitute () { return [ UriManager, Log, NotificationFactory, CaseFactory ] }
  constructor (uri, log, Notification, Case) {
    this.uri = uri
    this.log = log('notificationWorker')
    this.Notification = Notification
    this.Case = Case

    this.scheduler = new NotificationScheduler({
      Notification, knex,
      log: log('notificationScheduler'),
      processNotification: this.processNotification.bind(this)
    })
  }

  start () { this.scheduler.start() }
  stop () { this.scheduler.stop() }
  processNotificationQueue () { return this.scheduler.processQueue() }

  * queueNotifications (caseInstance, transaction) {
    this.log.debug('queueing notifications for case ' + caseInstance.id)
    const notifications = caseInstance.notification_targets.map((notification_target) => {
      const n = new this.Notification()
      n.case_id = caseInstance.id
      n.notification_target = notification_target
      return n
    })

    yield this.Notification.bulkCreate(notifications, { transaction })

    // We will schedule an immediate attempt to send the notification for
    // performance in the good case.
    // Don't schedule the immediate attempt if the worker isn't active, though.
    if (!this.scheduler.isEnabled()) return
    const log = this.log
    co(this.processNotificationsWithInstance.bind(this), notifications, caseInstance)
      .catch(function (err) {
        log.warn('immediate notification send failed ' + err.stack)
      })
  }

  * processNotification (notification) {
    notification = this.Notification.fromData(notification)
    const caseInstance = yield this.Case.findById(notification.case_id)
    // const caseInstance = this.Case.fromDatabaseModel(yield notification.getDatabaseModel().getCase())
    yield this.processNotificationWithInstance(notification, caseInstance)
  }

  * processNotificationsWithInstance (notifications, caseInstance) {
    yield notifications.map(function (notification) {
      return this.processNotificationWithInstance(notification, caseInstance)
    }, this)
    // Schedule any retries.
    yield this.scheduler.scheduleProcessing()
  }

  /**
   * @param {Notification} notification
   * @param {Case} caseInstance
   */
  * processNotificationWithInstance (notification, caseInstance) {
    this.log.debug('notifying notification_target ' + notification.notification_target +
                   ' about result: ' + caseInstance.state)
    let retry = true
    try {
      let response = {}

      const stateAttestation = makeCaseAttestation(caseInstance.getDataExternal().id, caseInstance.state)
      const stateHash = sha512(stateAttestation)
      this.log.info('attesting state ' + stateAttestation)

      // Generate crypto condition fulfillment for case state
      const stateAttestationSigned = {
        type: 'ed25519-sha512',
        signature: tweetnacl.util.encodeBase64(tweetnacl.sign.detached(
          tweetnacl.util.decodeBase64(stateHash),
          tweetnacl.util.decodeBase64(config.getIn(['keys', 'ed25519', 'secret']))
        ))
      }

      if (caseInstance.state === 'executed') {
        response = {
          type: 'and',
          subfulfillments: [
            stateAttestationSigned,
            caseInstance.exec_cond_fulfillment
          ]
        }
      } else if (caseInstance.state === 'rejected') {
        response = stateAttestationSigned
      } else {
        retry = false
        throw new Error('Tried to send notification for a case that is not yet finalized')
      }

      const result = yield request(notification.notification_target, {
        method: 'post',
        json: true,
        body: response
      })
      if (result.statusCode >= 400) {
        this.log.debug(response)
        throw new Error('Remote error for notification ' + result.statusCode,
          result.body)
      }
      retry = false
    } catch (err) {
      this.log.error('notification send failed ' + err)
    }

    if (retry) {
      yield this.scheduler.retryNotification(notification)
    } else {
      yield notification.destroy()
    }
  }
}

function sha512 (str) {
  return crypto.createHash('sha512').update(str).digest('base64')
}

module.exports = NotificationWorker
