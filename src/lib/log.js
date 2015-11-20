'use strict'

const hub = require('mag-hub')
const mag = require('mag')
const log = require('five-bells-shared').Log
const ValueFactory = require('constitute').ValueFactory

module.exports = new ValueFactory(log(mag, hub))
