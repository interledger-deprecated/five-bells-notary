'use strict'

const riverpig = require('riverpig')

const defaultLogger = riverpig('notary')

defaultLogger.create = riverpig

module.exports = defaultLogger

