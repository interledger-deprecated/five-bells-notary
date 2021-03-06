'use strict'

const config = require('./config')
const _ = require('lodash')
const url = require('url')
const path = require('path')

function parseKnexConnection (uri) {
  if (!uri) {
    return undefined
  }
  if (uri.startsWith('sqlite://')) {
    return {filename: uri.slice(9)}
  }
  const parsed = url.parse(uri)
  const auth = parsed.auth ? parsed.auth.split(':') : []
  return {
    host: parsed.hostname,
    port: parsed.port,
    user: auth[0] || config.get('db.connection_user'),
    password: auth[1] || config.get('db.connection_password'),
    database: parsed.pathname ? parsed.pathname.slice(1) : undefined
  }
}

function parseDatabaseType (uri) {
  return uri.split(':')[0]
}

function getKnexConfig () {
  const knexConfig = {
    sqlite: {
      client: 'sqlite3',
      useNullAsDefault: true
    },
    postgres: {client: 'pg'}
  }
  const uri = config.getIn(['db', 'uri'])
  if (!uri) {
    throw new Error('Must set NOTARY_DB_URI or NOTARY_UNIT_DB_URI')
  }
  const databaseType = parseDatabaseType(uri)
  if (!knexConfig[databaseType]) {
    throw new Error('Invalid database type in DB URI')
  }
  const migrations = {directory: path.join(__dirname, 'migrations')}
  const connection = parseKnexConnection(uri)
  const commonConfig = {connection, migrations}
  return _.assign(commonConfig, knexConfig[databaseType])
}

const knexConfig = getKnexConfig()
const knex = require('knex')(knexConfig)

module.exports.knex = knex
module.exports.config = knexConfig
