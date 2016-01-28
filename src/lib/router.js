'use strict'

const Container = require('constitute').Container
const makeRouter = require('koa-router')
const Model = require('five-bells-shared').Model
const CaseFactory = require('../models/db/case')

const CasesController = require('../controllers/cases')

module.exports = class Router {
  static constitute () { return [ Container ] }
  constructor (container) {
    this.container = container
    this.router = makeRouter()
  }

  setupDefaultRoutes () {
    const cases = this.container.constitute(CasesController)
    const CaseModel = this.container.constitute(CaseFactory)

    this.router.get('/cases/:id', cases.getResource)
    this.router.put('/cases/:id', CaseModel.createBodyParser(), cases.putResource)
    this.router.put('/cases/:id/fulfillment', Model.createBodyParser(), cases.putFulfillmentResource)
  }

  attach (app) {
    app.use(this.router.middleware())
    app.use(this.router.routes())
  }
}
