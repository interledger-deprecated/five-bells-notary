'use strict'

module.exports = CasesFactory

const co = require('co')
const CaseFactory = require('./db/case')
const NotaryFactory = require('./db/notary')
const Log = require('../lib/log')
const DB = require('../lib/db')
const Config = require('../lib/config')
const NotificationWorker = require('../lib/notificationWorker')
const CaseExpiryMonitor = require('../lib/caseExpiryMonitor')
const Condition = require('five-bells-condition').Condition
const UnprocessableEntityError = require('five-bells-shared').UnprocessableEntityError
const UnmetConditionError = require('five-bells-shared').UnmetConditionError
const NotFoundError = require('five-bells-shared').NotFoundError

CasesFactory.constitute = [CaseFactory, NotaryFactory, Log, DB, Config, NotificationWorker, CaseExpiryMonitor]
function CasesFactory (Case, Notary, log, db, config, notificationWorker, caseExpiryMonitor) {
  const logger = log('cases')

  return class Cases {

    static * getCase (caseId) {
      const item = yield Case.findById(caseId, { include: [ Notary.DbModel ] })
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
      } else if (caseInstance.notaries[0].url !== config.server.base_uri) {
        throw new UnprocessableEntityError(`The notary in the case must match this notary (expected: "${config.server.base_uri}", actual: "${caseInstance.notaries[0].url}")`)
      }

      yield db.transaction(co.wrap(function * (transaction) {
        // const notaries = yield Notary.bulkCreate(caseInstance.notaries, { transaction })
        yield Case.create(caseInstance, { transaction })
        // yield caseInstance.getDatabaseModel().addNotaries(notaries, { transaction })
      }))

      logger.debug('created case ID ' + caseId)

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
        throw new UnmetConditionError('Invalid execution_condition_fulfillment')
      }

      caseExpiryMonitor.validateNotExpired(caseInstance)

      if (caseInstance.state !== 'executed') {
        caseInstance.state = 'executed'
        caseInstance.execution_condition_fulfillment = fulfillment

        yield db.transaction(function *(transaction) {
          yield caseInstance.save({ transaction })
          yield notificationWorker.queueNotifications(caseInstance, transaction)
        })
      }

      return caseInstance.getDataExternal()
    }
  }
}
