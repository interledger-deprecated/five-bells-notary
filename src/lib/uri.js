'use strict'

const BaseUriManager = require('five-bells-shared').UriManager
const config = require('./config')

module.exports = class UriManager extends BaseUriManager {
  constructor () {
    super(config.getIn(['server', 'base_uri']))

    this.addResource('case', '/cases/:id')
  }
}
