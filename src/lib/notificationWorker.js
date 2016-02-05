'use strict'

const crypto = require('crypto')
const defer = require('co-defer')
const request = require('co-request')
const tweetnacl = require('tweetnacl')
const makeCaseAttestation = require('five-bells-shared/utils/makeCaseAttestation')
const UriManager = require('./uri')
const Log = require('./log')
const config = require('./config')
const NotificationFactory = require('../models/db/notification')
const CaseFactory = require('../models/db/case')
const knex = require('../lib/knex').knex

class NotificationWorker {
  static constitute () { return [ UriManager, Log, NotificationFactory, CaseFactory ] }
  constructor (uri, log, Notification, Case) {
    this._timeout = null

    this.uri = uri
    this.log = log('notificationWorker')
    this.Notification = Notification
    this.Case = Case

    this.processingInterval = 1000
  }

  * start () {
    if (!this._timeout) {
      this._timeout = defer.setTimeout(this.processNotificationQueue.bind(this), this.processingInterval)
    }
  }

  * queueNotifications (caseInstance, transaction) {
    this.log.debug('queueing notifications for case ' + caseInstance.id)
    const notifications = caseInstance.notification_targets.map((notification_target) => {
      const n = new this.Notification()
      n.case_id = caseInstance.id
      n.notification_target = notification_target
      return n
    })

    yield this.Notification.bulkCreate(notifications, { transaction })

    // for (const notification of notifications) {
    //   // We will schedule an immediate attempt to send the notification for
    //   // performance in the good case.
    //   co(this.processNotificationWithInstance(notification, caseInstance)).catch((err) => {
    //     this.log.debug('immediate notification send failed ' + err)
    //   })
    // }
  }

  scheduleProcessing () {
    if (this._timeout) {
      this.log.debug('scheduling notifications')
      clearTimeout(this._timeout)
      defer(this.processNotificationQueue.bind(this))
    }
  }

  * processNotificationQueue () {
    const notifications = yield knex(this.Notification.tableName).select()
          .where('retry_at', null).orWhere('retry_at', '<', new Date()).then()

    if (notifications.length) {
      this.log.debug('processing ' + notifications.length + ' notifications')
      yield notifications.map(this.processNotification.bind(this))
    }
    if (this._timeout) {
      clearTimeout(this._timeout)
      this._timeout = defer.setTimeout(this.processNotificationQueue.bind(this), this.processingInterval)
    }
  }

  * processNotification (notification) {
    notification = this.Notification.fromData(notification)
    const caseInstance = yield this.Case.findById(notification.case_id)
    // const caseInstance = this.Case.fromDatabaseModel(yield notification.getDatabaseModel().getCase())
    yield this.processNotificationWithInstance(notification, caseInstance)
  }

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
        method: 'put',
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
      let retries = notification.retry_count = (notification.retry_count || 0) + 1
      let delay = Math.min(120, Math.pow(2, retries))
      notification.retry_at = new Date(Date.now() + 1000 * delay)
      yield notification.save()
    } else {
      yield notification.destroy({'id': notification.id})
    }
  }

  stop () {
    if (this._timeout) {
      clearTimeout(this._timeout)
      this._timeout = null
    }
  }
}

function sha512 (str) {
  return crypto.createHash('sha512').update(str).digest('base64')
}

module.exports = NotificationWorker
