'use strict'

const Container = require('constitute').Container
const makeRouter = require('koa-router')
const parseBody = require('co-body')
const metadata = require('../controllers/metadata')
const health = require('../controllers/health')
const CasesController = require('../controllers/cases')

module.exports = class Router {
  static constitute () { return [ Container ] }
  constructor (container) {
    this.container = container
    this.router = makeRouter()
  }

  setupDefaultRoutes () {
    const cases = this.container.constitute(CasesController)

    this.router.get('/', metadata.getResource)
    this.router.get('/health', health.getResource)
    this.router.get('/cases/:id', cases.getResource)
    this.router.put('/cases/:id', function * (next) {
      this.body = yield parseBody(this)
      yield next
    }, cases.putResource)
    this.router.put('/cases/:id/fulfillment', cases.putFulfillmentResource)
    this.router.post('/cases/:id/targets', cases.postNotificationTargetResource)
  }

  attach (app) {
    app.use(this.router.middleware())
    app.use(this.router.routes())
  }
}
