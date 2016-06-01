'use strict'

const parse = require('co-body')
const CasesFactory = require('../models/cases').CasesFactory
const Validator = require('five-bells-shared').Validator

CasesControllerFactory.constitute = [CasesFactory, Validator]
function CasesControllerFactory (Cases, validator) {
  return class CasesController {
    /**
     * @api {get} /cases/:id Get information about a case
     * @apiName GetCase
     * @apiGroup Case
     * @apiVersion 1.0.0
     *
     * @apiDescription Get Notary's perspective on a case.
     *
     * @apiParam {String} id UUID of the case
     *
     * @apiSuccess {JSON} body Case object in JSON format
     */
    static * getResource () {
      const id = this.params.id.toLowerCase()
      validator.validateUriParameter('id', id, 'Uuid')
      this.body = yield Cases.getCase(id)
    }

    /**
     * @api {put} /cases/:id Create a new case
     * @apiName PutCase
     * @apiGroup Case
     * @apiVersion 1.0.0
     *
     * @apiDescription Inform Notary about a new case.
     *
     * @apiParam {String} id UUID of the case
     * @apiParam {JSON} body id: Same with id above<br/>
     * execution_condition: crypto condition to be executed by Notary<br/>
     * expires_at: expiration time<br/>
     * notaries: array of Notary URLs
     *
     * @return {void}
     */
    static * putResource () {
      const id = this.params.id.toLowerCase()
      validator.validateUriParameter('id', id, 'Uuid')
      const result = yield Cases.putCase(this.body)
      this.body = result.caseData
      this.status = result.existed ? 200 : 201
    }

    /**
     * @api {put} /cases/:id/fulfillment Fulfill a case condition
     * @apiName PutCaseFulfillment
     * @apiGroup Case
     * @apiVersion 1.0.0
     *
     * @apiDescription Submit a fulfillment for a case.
     * @apiParam {String} id UUID of the case
     * @apiParam {JSON} body type: fulfillment type<br/>
     * signature: fulfillment signature
     *
     * @return {void}
     */
    static * putFulfillmentResource () {
      const id = this.params.id.toLowerCase()
      validator.validateUriParameter('id', id, 'Uuid')
      this.body = yield Cases.fulfillCase(id, yield parse.text(this))
      this.status = 200
    }

    /**
     * @api {post} /cases/:id/targets Add a notification target
     * @apiName PostCaseTarget
     * @apiGroup Case
     * @apiVersion 1.0.0
     *
     * @apiDescription Add an additional notification target to an existing case
     * @apiParam {String} id UUID of the case
     * @apiParam {JSON} body
     *
     * @return {void}
     */
    static * postNotificationTargetResource () {
      const id = this.params.id.toLowerCase()
      validator.validateUriParameter('id', id, 'Uuid')
      const targets = yield validator.validateBody(this, 'AdditionalTargets')

      this.body = yield Cases.addNotificationTarget(id, targets)
      this.status = 200
    }
  }
}

module.exports = CasesControllerFactory
