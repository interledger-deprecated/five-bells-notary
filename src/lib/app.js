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
const createTables = require('./db').createTables
const readLookupTables = require('./readLookupTables').readLookupTables
const path = require('path')

module.exports = class App {
  static constitute () { return [ Router, Validator, Log, NotificationWorker, TimerWorker ] }
  constructor (router, validator, log, notificationWorker, timerWorker) {
    this.router = router
    this.validator = validator
    this.log = log('app')
    this.notificationWorker = notificationWorker
    this.timerWorker = timerWorker

    const notarySchemaPath = path.join(__dirname, '/../../schemas')
    const conditionSchemaPath =
      path.resolve(path.dirname(require.resolve('five-bells-condition')), 'schemas')

    validator.loadSharedSchemas()
    validator.loadSchemasFromDirectory(notarySchemaPath)
    validator.loadSchemasFromDirectory(conditionSchemaPath)

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
      yield createTables()
    }
    yield readLookupTables()
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
