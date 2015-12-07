'use strict'

const co = require('co')
const request = require('five-bells-shared/utils/request')
const UnprocessableEntityError = require('five-bells-shared').UnprocessableEntityError
const UnmetConditionError = require('five-bells-shared').UnmetConditionError
const Model = require('five-bells-shared').Model
const CaseFactory = require('../models/case')
const NotaryFactory = require('../models/notary')
const Condition = require('five-bells-condition').Condition
const Log = require('../lib/log')
const DB = require('../lib/db')
const Config = require('../lib/config')
const NotificationWorker = require('../lib/notificationWorker')
const CaseExpiryMonitor = require('../lib/caseExpiryMonitor')

CasesControllerFactory.constitute = [CaseFactory, NotaryFactory, Log, DB, Config, NotificationWorker, CaseExpiryMonitor]
function CasesControllerFactory (Case, Notary, log, db, config, notificationWorker, caseExpiryMonitor) {
  log = log('cases')

  return class CasesController {
    static init (router) {
      router.get('/cases/:id', this.getResource)
      router.put('/cases/:id', Case.createBodyParser(), this.putResource)
      router.put('/cases/:id/fulfillment', Model.createBodyParser(), this.putFulfillmentResource)
    }

    /**
     * @api {get} /cases/:id Get information about a case
     * @apiName GetCase
     * @apiGroup Case
     * @apiVersion 1.0.0
     *
     * @apiDescription Get the witness' perspective on a case.
     *
     * @apiParam {String} id Hash of the case
     *
     * @return {void}
     */
    static * getResource () {
      let id = this.params.id
      request.validateUriParameter('id', id, 'Uuid')
      id = id.toLowerCase()

      const item = yield Case.findById(this.params.id, { include: [ Notary.DbModel ] })

      if (!item) {
        this.status = 404
        return
      }

      this.body = item.getDataExternal()
    }

    /**
     * @api {put} /cases/:id Create a new case
     * @apiName PutCase
     * @apiGroup Case
     * @apiVersion 1.0.0
     *
     * @apiDescription Inform the witness about a new case.
     *
     * @apiParam {String} id Hash of the case
     *
     * @return {void}
     */
    static * putResource () {
      let id = this.params.id
      request.validateUriParameter('id', id, 'Uuid')
      id = id.toLowerCase()
      const caseInstance = this.body
      caseInstance.id = id
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

      log.debug('created case ID ' + id)

      yield caseExpiryMonitor.watch(caseInstance)

      this.body = caseInstance.getDataExternal()
      this.status = 201
    }

    /**
     * @api {put} /cases/:id/fulfillment Fulfill a case condition
     * @apiName PutCaseFulfillment
     * @apiGroup Case
     * @apiVersion 1.0.0
     *
     * @apiDescription Submit a fulfillment to a case.
     * @apiParam {String} id UUID of the case
     *
     * @return {void}
     */
    static * putFulfillmentResource () {
      const id = this.params.id
      const caseInstance = yield Case.findById(id)
      const fulfillment = this.body.getData()
      if (!caseInstance) {
        throw new UnprocessableEntityError('Unknown case ID ' + id)
      }

      if (caseInstance.state === 'executed') {
        this.body = caseInstance.getDataExternal()
        this.status = 200
        return
      }
      if (caseInstance.state === 'rejected') {
        throw new UnprocessableEntityError('Case ' + id + ' is already rejected')
      }
      caseExpiryMonitor.validateNotExpired(caseInstance)

      if (!Condition.testFulfillment(caseInstance.execution_condition, fulfillment)) {
        throw new UnmetConditionError('Invalid execution_condition_fulfillment')
      }

      caseInstance.state = 'executed'
      caseInstance.execution_condition_fulfillment = fulfillment

      this.body = caseInstance.getDataExternal()
      this.status = 200

      yield db.transaction(function *(transaction) {
        yield caseInstance.save({ transaction })
        yield notificationWorker.queueNotifications(caseInstance, transaction)
      })
    }
  }
}

module.exports = CasesControllerFactory
