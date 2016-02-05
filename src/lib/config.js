'use strict'

const Config = require('five-bells-shared').Config
const envPrefix = 'notary'

module.exports = Config.loadConfig(envPrefix)
