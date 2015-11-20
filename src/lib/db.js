'use strict'

const Sequelize = require('sequelize')
const Config = require('./config')
const Log = require('./log')

module.exports = class Database extends Sequelize {
  static constitute () { return [ Config, Log ] }
  constructor (config, log) {
    super(config.db.uri, {
      logging: log('sequelize').debug,
      omitNull: true
    })
  }
}
