'use strict'

const cc = require('five-bells-condition')
const co = require('co')
const request = require('co-request')
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
    const notifications = caseInstance.notification_targets.map((notificationTarget) => {
      const n = new this.Notification()
      n.case_id = caseInstance.id
      n.notification_target = notificationTarget
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
      const stateAttestationBuffer = new Buffer(stateAttestation, 'utf8')

      this.log.info('attesting state ' + stateAttestation)

      const signatureCondition = new cc.Ed25519()
      signatureCondition.sign(stateAttestationBuffer, new Buffer(config.getIn(['keys', 'ed25519', 'secret']), 'base64'))

      const notaryCondition = new cc.PrefixSha256()
      notaryCondition.setPrefix(stateAttestationBuffer)
      notaryCondition.setSubfulfillment(signatureCondition)

      if (caseInstance.state === 'executed') {
        const condition = new cc.ThresholdSha256()
        condition.addSubfulfillment(notaryCondition)
        condition.addSubfulfillmentUri(caseInstance.exec_cond_fulfillment)
        condition.setThreshold(2)
        response = condition.serializeUri()
      } else if (caseInstance.state === 'rejected') {
        response = notaryCondition.serializeUri()
      } else {
        retry = false
        throw new Error('Tried to send notification for a case that is not yet finalized')
      }

      const result = yield request(notification.notification_target, {
        method: 'put',
        body: response
      })
      if (result.statusCode >= 400) {
        if (result.statusCode < 500) retry = false

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

module.exports = NotificationWorker
