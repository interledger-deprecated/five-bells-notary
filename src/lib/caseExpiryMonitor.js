'use strict'

const moment = require('moment')
const TimeQueue = require('./timeQueue')
const NotificationWorker = require('./notificationWorker')
const DB = require('./db')
const Log = require('./log')
const ExpiredCaseError = require('../errors/expired-case-error')
const CaseFactory = require('../models/db/case')

class CaseExpiryMonitor {
  static constitute () { return [ TimeQueue, NotificationWorker, DB, Log, CaseFactory ] }
  constructor (timeQueue, notificationWorker, db, log, Case) {
    this.queue = timeQueue
    this.notificationWorker = notificationWorker
    this.db = db
    this.log = log('caseExpiryMonitor')
    this.Case = Case
  }

  validateNotExpired (caseInstance) {
    if (caseInstance.expires_at &&
      moment().isAfter(caseInstance.expires_at)) {
      throw new ExpiredCaseError('Cannot modify case ' +
        'after expires_at date')
    }
  }

  * expireCase (caseId) {
    const _this = this

    yield this.db.transaction(function *(transaction) {
      let caseInstance = yield _this.Case.findById(caseId, { transaction })

      if (!caseInstance) {
        _this.log.error('trying to expire case that cannot be found ' +
          'in the database: ' + caseId)
        return
      }

      if (caseInstance.state === 'proposed') {
        caseInstance.state = 'rejected'
        yield caseInstance.save({ transaction })

        _this.log.debug('expired case: ' + caseId)

        yield _this.notificationWorker.queueNotifications(caseInstance, transaction)
      }
    })

    // Should process case state notifications soon, because some cases
    // may have changed state
    this.notificationWorker.scheduleProcessing()
  }

  * watch (caseInstance) {
    // Start the expiry countdown if we're not already watching it
    if (!this.queue.includes(caseInstance.id)) {
      const now = moment()
      const expiry = moment(caseInstance.expires_at)
      if (caseInstance.expires_at && now.isBefore(expiry)) {
        yield this.queue.insert(expiry, caseInstance.id)

        this.log.debug('case ' + caseInstance.id +
          ' will expire in ' + expiry.diff(now, 'milliseconds') + 'ms')
      }
    } else if (caseInstance.state === 'executed' ||
      caseInstance.state === 'rejected' ||
      caseInstance.state === 'failed') {
      this.unwatch(caseInstance.id)
    }
  }

  * processExpiredCases () {
    this.log.debug('checking for cases to expire')
    const casesToExpire = this.queue.popBeforeDate(moment())
    for (let id of casesToExpire) {
      yield this.expireCase(id)
    }
  }

  unwatch (caseId) {
    this.log.debug('unwatch case: ' + caseId)
    this.queue.remove(caseId)
  }
}

module.exports = CaseExpiryMonitor
