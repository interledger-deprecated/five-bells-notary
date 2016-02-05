'use strict'

const co = require('co')
const koa = require('koa')
const logger = require('koa-mag')
const errorHandler = require('five-bells-shared/middlewares/error-handler')
const Validator = require('five-bells-shared').Validator
const Config = require('./config')
const Router = require('./router')
const DB = require('./db')
const Log = require('./log')
const NotificationWorker = require('./notificationWorker')
const TimerWorker = require('./timerWorker')
const knex = require('./knex')

module.exports = class App {
  static constitute () { return [ Config, Router, Validator, DB, Log, NotificationWorker, TimerWorker ] }
  constructor (config, router, validator, db, log, notificationWorker, timerWorker) {
    this.config = config
    this.router = router
    this.validator = validator
    this.db = db
    this.log = log('app')
    this.notificationWorker = notificationWorker
    this.timerWorker = timerWorker

    validator.loadSharedSchemas()
    validator.loadSchemasFromDirectory(__dirname + '/../../schemas')
    validator.loadSchemasFromDirectory(__dirname + '/../../node_modules/five-bells-condition/schemas')

    const app = this.app = koa()
    app.use(logger({mag: log('http')}))
    app.use(errorHandler({log: log('error-handler')}))

    router.setupDefaultRoutes()
    router.attach(app)
  }

  start () {
    co(this._start.bind(this)).catch((err) => {
      this.log.critical(err)
    })
  }

  * _start () {
    if (process.env.NOTARY_RUN_MIGRATION) {
      yield knex.knex.migrate.rollback(knex.config)
      yield knex.knex.migrate.latest(knex.config)
    }
    yield this.notificationWorker.start()
    yield this.timerWorker.start()
    this.listen()
  }

  listen () {
    this.app.listen(this.config.server.port)
    this.log.info('notary listening on ' + this.config.server.bind_ip +
      ':' + this.config.server.port)
    this.log.info('public at ' + this.config.server.base_uri)
  }
}
