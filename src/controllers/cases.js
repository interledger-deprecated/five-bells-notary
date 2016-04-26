'use strict'

const parse = require('co-body')
const request = require('five-bells-shared/utils/request')
const CasesFactory = require('../models/cases')
CasesControllerFactory.constitute = [CasesFactory]
function CasesControllerFactory (Cases) {
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
      request.validateUriParameter('id', id, 'Uuid')
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
      request.validateUriParameter('id', id, 'Uuid')
      const result = yield Cases.putCase(id, this.body)
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
      this.body = yield Cases.fulfillCase(id, yield parse.text(this))
      this.status = 200
    }
  }
}

module.exports = CasesControllerFactory
