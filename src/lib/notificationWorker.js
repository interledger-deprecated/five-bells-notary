'use strict'

const defer = require('co-defer')
const request = require('co-request')
const tweetnacl = require('tweetnacl')
const UriManager = require('./uri')
const Log = require('./log')
const Config = require('./config')
const NotificationFactory = require('../models/notification')
const CaseFactory = require('../models/case')

class NotificationWorker {
  static constitute () { return [ UriManager, Log, Config, NotificationFactory, CaseFactory ] }
  constructor (uri, log, config, Notification, Case) {
    this._timeout = null

    this.uri = uri
    this.log = log('notificationWorker')
    this.config = config
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
    const notifications = yield caseInstance.transfers.map((transfer) => {
      return this.Notification.fromDatabaseModel(this.Notification.build({
        case_id: caseInstance.id,
        transfer
      }, { transaction }))
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
    const notifications = yield this.Notification.findAll()
    this.log.debug('processing ' + notifications.length + ' notifications')
    yield notifications.map(this.processNotification.bind(this))

    if (this._timeout && notifications.length) {
      clearTimeout(this._timeout)
      this._timeout = defer.setTimeout(this.processNotificationQueue.bind(this), this.processingInterval)
    }
  }

  * processNotification (notification) {
    const caseInstance = this.Case.fromDatabaseModel(yield notification.getDatabaseModel().getCase())
    yield this.processNotificationWithInstance(notification, caseInstance)
  }

  * processNotificationWithInstance (notification, caseInstance) {
    this.log.debug('notifying transfer ' + notification.transfer + ' about result: ' + caseInstance.state)
    try {
      const transferResult = yield request(notification.transfer, {
        method: 'get',
        json: true
      })
      if (transferResult.statusCode !== 200) {
        throw new Error('Invalid transfer')
      }
      const transfer = transferResult.body

      const stateAttestation = 'urn:notary:' + caseInstance.getDataExternal().id + ':' + caseInstance.state
      this.log.info('attesting state ' + stateAttestation)

      // Generate crypto condition fulfillment for case state
      const stateAttestationSigned = {
        type: 'ed25519-sha512',
        signature: tweetnacl.util.encodeBase64(tweetnacl.sign.detached(
          tweetnacl.util.decodeUTF8(stateAttestation),
          tweetnacl.util.decodeBase64(this.config.keys.ed25519.secret)
        ))
      }

      if (caseInstance.state === 'executed') {
        transfer.execution_condition_fulfillment = {
          type: 'and',
          subfulfillments: [
            stateAttestationSigned,
            caseInstance.execution_condition_fulfillment
          ]
        }
      } else if (caseInstance.state === 'rejected') {
        transfer.cancellation_condition_fulfillment = stateAttestationSigned
      } else {
        throw new Error('Tried to send notification for a case that is not yet finalized')
      }

      const result = yield request(notification.transfer, {
        method: 'put',
        json: true,
        body: transfer
      })
      if (result.statusCode >= 400) {
        this.log.debug('remote error for notification ' + result.statusCode,
          result.body)
        this.log.debug(transfer)
      }
    } catch (err) {
      this.log.debug('notification send failed ' + err)
    }
    yield notification.destroy()
  }

  stop () {
    if (this._timeout) {
      clearTimeout(this._timeout)
      this._timeout = null
    }
  }
}

module.exports = NotificationWorker
