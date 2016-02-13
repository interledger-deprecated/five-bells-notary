'use strict'

// This module encapsulates Knex instance, which is used to access database.
// Environment variable NOTARY_DB_ENV should be set according to deployment type
// E.g., 'production' or 'staging'.
// This is used to look up Knex configuration in knexfile.js
const knexConfigEnv = process.env.NOTARY_DB_ENV ? process.env.NOTARY_DB_ENV
      : 'development'
const knexConfig = require('../../knexfile')[knexConfigEnv]
const knex = require('knex')(knexConfig)
const path = require('path')

module.exports.knex = knex
module.exports.config = {
  directory: path.join(__dirname, '/../../migrations'),
  // this table will be populated with some information about your
  // migration files.  it will be automatically created, if it
  // doesn't already exist.
  tableName: 'migrations',
  client: knexConfig.client
}
