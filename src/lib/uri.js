'use strict'

const UriManager = require('five-bells-shared/lib/uri-manager').UriManager
const config = require('./config')

const uri = module.exports = new UriManager(config.getIn(['server', 'base_uri']))

uri.addResource('case', '/cases/:id')
