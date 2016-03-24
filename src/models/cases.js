'use strict'

module.exports = CasesFactory

const co = require('co')
const CaseFactory = require('./db/case')
const Log = require('../lib/log')
const DB = require('../lib/db')
const config = require('../lib/config')
const NotificationWorker = require('../lib/notificationWorker')
const CaseExpiryMonitor = require('../lib/caseExpiryMonitor')
const Condition = require('five-bells-condition').Condition
const UnprocessableEntityError = require('five-bells-shared').UnprocessableEntityError
const UnmetConditionError = require('five-bells-shared').UnmetConditionError
const NotFoundError = require('five-bells-shared').NotFoundError
const knex = require('../lib/knex')

CasesFactory.constitute = [CaseFactory, Log, DB, NotificationWorker, CaseExpiryMonitor]
function CasesFactory (Case, log, db, notificationWorker, caseExpiryMonitor) {
  return class Cases {

    static * getCase (caseId) {
      const item = yield Case.findById(caseId)
      if (!item) {
        throw new NotFoundError('Case ' + caseId + ' not found')
      }
      return item.getDataExternal()
    }

    static * putCase (caseId, caseInstance) {
      caseInstance.id = caseId
      caseInstance.state = 'proposed'

      if (caseInstance.notaries.length !== 1) {
        throw new UnprocessableEntityError('The case must contain exactly one notary (this notary)')
      } else if (caseInstance.notaries[0].url !== config.getIn(['server', 'base_uri'])) {
        throw new UnprocessableEntityError('The notary in the case must match this notary ' +
            `(expected: "${config.getIn(['server', 'base_uri'])}", actual: '${caseInstance.notaries[0].url}')`)
      }

      // Combination of transaction / knex / sqlite3 doesn't seem to work,
      // So don't use transaction on sqlite3.
      const dbAccess = function * (transaction) {
        yield Case.create(caseInstance, {transaction})
      }
      if (knex.config.client === 'sqlite3') {
        yield dbAccess()
      } else {
        yield knex.knex.transaction(co.wrap(function * (transaction) {
          yield dbAccess(transaction)
        }))
      }
      yield caseExpiryMonitor.watch(caseInstance)

      return caseInstance.getDataExternal()
    }

    static * fulfillCase (caseId, fulfillment) {
      const caseInstance = yield Case.findById(caseId)
      if (!caseInstance) {
        throw new UnprocessableEntityError('Unknown case ID ' + caseId)
      } else if (caseInstance.state === 'rejected') {
        throw new UnprocessableEntityError('Case ' + caseId + ' is already rejected')
      } else if (!Condition.testFulfillment(caseInstance.execution_condition, fulfillment)) {
        throw new UnmetConditionError('Invalid exec_cond_fulfillment')
      }

      caseExpiryMonitor.validateNotExpired(caseInstance)

      if (caseInstance.state !== 'executed') {
        caseInstance.state = 'executed'
        caseInstance.exec_cond_fulfillment = fulfillment

        // Combination of transaction / knex / sqlite3 doesn't seem to work,
        // So don't use transaction on sqlite3.
        const dbAccess = function * (transaction) {
          yield caseInstance.save({transaction})
          yield notificationWorker.queueNotifications(caseInstance, {transaction})
        }
        if (knex.config.client === 'sqlite3') {
          yield dbAccess()
        } else {
          yield knex.knex.transaction(co.wrap(function * (transaction) {
            yield dbAccess(transaction)
          }))
        }
      }

      return caseInstance.getDataExternal()
    }
  }
}
