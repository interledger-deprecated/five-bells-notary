'use strict'

const BaseUriManager = require('five-bells-shared').UriManager
const Config = require('./config')

module.exports = class UriManager extends BaseUriManager {
  static constitute () { return [ Config ] }
  constructor (config) {
    super(config.server.base_uri)

    this.addResource('case', '/cases/:id')
  }
}
