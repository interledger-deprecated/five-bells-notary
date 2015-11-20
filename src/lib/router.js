'use strict'

const Container = require('constitute').Container
const makeRouter = require('koa-router')

const CasesController = require('../controllers/cases')

module.exports = class Router {
  static constitute () { return [ Container ] }
  constructor (container) {
    this.container = container
    this.router = makeRouter()
  }

  setupDefaultRoutes () {
    const cases = this.container.constitute(CasesController)
    cases.init(this.router)
  }

  attach (app) {
    app.use(this.router.middleware())
    app.use(this.router.routes())
  }
}
