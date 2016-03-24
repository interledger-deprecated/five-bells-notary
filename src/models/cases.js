'use strict'

module.exports = CasesFactory

const CaseFactory = require('./db/case')
const Log = require('../lib/log')
const config = require('../lib/config')
const NotificationWorker = require('../lib/notificationWorker')
const CaseExpiryMonitor = require('../lib/caseExpiryMonitor')
const Condition = require('five-bells-condition').Condition
const UnprocessableEntityError = require('five-bells-shared').UnprocessableEntityError
const UnmetConditionError = require('five-bells-shared').UnmetConditionError
const NotFoundError = require('five-bells-shared').NotFoundError
const db = require('./db/cases')

CasesFactory.constitute = [CaseFactory, Log, NotificationWorker, CaseExpiryMonitor]
function CasesFactory (Case, log, notificationWorker, caseExpiryMonitor) {
  return class Cases {

    static * getCase (caseId) {
      const item = yield db.getCase(Case, caseId)
      if (!item) {
        throw new NotFoundError('Case ' + caseId + ' not found')
      }
      return item.getDataExternal()
    }

    static * putCase (caseId, caseInstance) {
      caseInstance.id = caseId
      caseInstance.state = 'proposed'

      if (caseInstance.notaries.length !== 1) {
        throw new UnprocessableEntityError(
          'The case must contain exactly one notary (this notary)')
      } else if (caseInstance.notaries[0] !==
                 config.getIn(['server', 'base_uri'])) {
        throw new UnprocessableEntityError(
          'The notary in the case must match this notary ' +
          `(expected: "${config.getIn(['server', 'base_uri'])}", ` +
          `actual: '${caseInstance.notaries[0]}')`)
      }

      const existed = yield db.upsertCase(Case, caseInstance)
      yield caseExpiryMonitor.watch(caseInstance)
      return {caseData: caseInstance.getDataExternal(), existed}
    }

    static * fulfillCase (caseId, fulfillment) {
      return yield db.transaction(function * (transaction) {
        const caseInstance = yield db.getCase(Case, caseId, {transaction})
        if (!caseInstance) {
          throw new UnprocessableEntityError('Unknown case ID ' + caseId)
        } else if (caseInstance.state === 'rejected') {
          throw new UnprocessableEntityError(
            'Case ' + caseId + ' is already rejected')
        } else if (!Condition.testFulfillment(
            caseInstance.execution_condition, fulfillment)) {
          throw new UnmetConditionError('Invalid exec_cond_fulfillment')
        }

        caseExpiryMonitor.validateNotExpired(caseInstance)

        if (caseInstance.state !== 'executed') {
          caseInstance.state = 'executed'
          caseInstance.exec_cond_fulfillment = fulfillment
          yield db.updateCase(caseInstance, {transaction})
          yield notificationWorker.queueNotifications(caseInstance, transaction)
        }
        return caseInstance.getDataExternal()
      })
    }
  }
}
