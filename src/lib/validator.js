'use strict'

const path = require('path')

const Validator = require('five-bells-shared').Validator

const validator = module.exports = new Validator()

validator.loadSharedSchemas()
validator.loadSchemasFromDirectory(path.join(__dirname, '../../schemas'))
