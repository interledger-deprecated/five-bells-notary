'use strict'

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
     * @apiDescription Get the witness' perspective on a case.
     *
     * @apiParam {String} id Hash of the case
     *
     * @return {void}
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
     * @apiDescription Inform the witness about a new case.
     *
     * @apiParam {String} id Hash of the case
     *
     * @return {void}
     */
    static * putResource () {
      const id = this.params.id.toLowerCase()
      request.validateUriParameter('id', id, 'Uuid')
      this.body = yield Cases.putCase(id, this.body)
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
      const id = this.params.id.toLowerCase()
      this.body = yield Cases.fulfillCase(id, this.body.getData())
      this.status = 200
    }
  }
}

module.exports = CasesControllerFactory
