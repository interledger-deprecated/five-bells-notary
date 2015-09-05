'use strict'

const koa = require('koa')
const logger = require('koa-mag')
const config = require('./services/config')
const log = require('./services/log')
const errorHandler = require('@ripple/five-bells-shared/middlewares/error-handler')

const app = module.exports = koa()

app.use(logger())

app.use(errorHandler({log: log('error-handler')}))

if (!module.parent) {
  app.listen(config.server.port)
  log('app').info('witness listening on ' + config.server.bind_ip + ':' +
    config.server.port)
  log('app').info('public at ' + config.server.base_uri)
}
