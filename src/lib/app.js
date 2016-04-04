'use strict'

const co = require('co')
const koa = require('koa')
const logger = require('koa-mag')
const errorHandler = require('five-bells-shared/middlewares/error-handler')
const Validator = require('five-bells-shared').Validator
const config = require('./config')
const Router = require('./router')
const Log = require('./log')
const NotificationWorker = require('./notificationWorker')
const TimerWorker = require('./timerWorker')
const knex = require('./knex')
const path = require('path')

module.exports = class App {
  static constitute () { return [ Router, Validator, Log, NotificationWorker, TimerWorker ] }
  constructor (router, validator, log, notificationWorker, timerWorker) {
    this.router = router
    this.validator = validator
    this.log = log('app')
    this.notificationWorker = notificationWorker
    this.timerWorker = timerWorker

    validator.loadSharedSchemas()
    validator.loadSchemasFromDirectory(path.join(__dirname, '/../../schemas'))
    validator.loadSchemasFromDirectory(path.join(__dirname, '/../../node_modules/five-bells-condition/schemas'))

    const app = this.app = koa()
    app.use(logger({mag: log('http')}))
    app.use(errorHandler({log: log('error-handler')}))

    router.setupDefaultRoutes()
    router.attach(app)
  }

  start () {
    co(this._start.bind(this)).catch((err) => {
      this.log.critical(err.stack)
    })
  }

  * _start () {
    const dbSync = config.getIn(['db', 'sync'])
    if (dbSync) {
      yield knex.knex.migrate.rollback(knex.config)
      yield knex.knex.migrate.latest(knex.config)
    }
    this.notificationWorker.start()
    this.timerWorker.start()
    this.listen()
  }

  listen () {
    this.app.listen(config.getIn(['server', 'port']))
    this.log.info('notary listening on ' + config.getIn(['server', 'bind_ip']) +
      ':' + config.getIn(['server', 'port']))
    this.log.info('public at ' + config.getIn(['server', 'base_uri']))
  }
}
