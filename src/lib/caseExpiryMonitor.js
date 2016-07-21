'use strict'

const moment = require('moment')
const TimeQueue = require('./timeQueue')
const NotificationWorker = require('./notificationWorker')
const log = require('./log')
const ExpiredCaseError = require('../errors/expired-case-error')
const getCaseByUuid = require('../models/db/case').getCaseByUuid
const updateCase = require('../models/db/case').updateCase
const co = require('co')
const knex = require('./knex')

class CaseExpiryMonitor {
  static constitute () { return [ TimeQueue, NotificationWorker ] }
  constructor (timeQueue, notificationWorker) {
    this.queue = timeQueue
    this.notificationWorker = notificationWorker
    this.log = log.create('caseExpiryMonitor')
  }

  validateNotExpired (caseInstance) {
    if (caseInstance.expires_at &&
      moment().isAfter(caseInstance.expires_at)) {
      throw new ExpiredCaseError('Cannot create or modify case ' +
        'after expires_at date')
    }
  }

  * expireCase (caseId) {
    const _this = this

    // Combination of transaction / knex / sqlite3 doesn't seem to work,
    // So don't use transaction on sqlite3.
    const dbAccess = function * (transaction) {
      const caseInstance = yield getCaseByUuid(caseId, {transaction})
      if (!caseInstance) {
        _this.log.error('trying to expire case that cannot be found ' +
          'in the database: ' + caseId)
        throw new ExpiredCaseError('trying to expire case that cannot be found ' +
                                   'in the database: ' + caseId)
      }

      if (caseInstance.state === 'proposed') {
        caseInstance.state = 'rejected'
        yield updateCase(caseInstance, {transaction})

        _this.log.debug('expired case: ' + caseId)

        yield _this.notificationWorker.queueNotifications(caseInstance, transaction)
      }
    }
    if (knex.config.client === 'sqlite3') {
      yield dbAccess()
    } else {
      yield knex.knex.transaction(co.wrap(function * (transaction) {
        yield dbAccess(transaction)
      }))
    }
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
