'use strict'

const fs = require('fs')
const path = require('path')
const knex = require('./knex').knex

const tables = [
  'N_CASES',
  'N_NOTIFICATIONS'
]

function sequence (promises) {
  return promises.length === 0 ? Promise.resolve()
    : promises[0].then(() => sequence(promises.slice(1)))
}

function executeStatements (knex, sql) {
  const separator = ';\n'
  const statements = sql.split(separator)
  return sequence(statements.map((statement) => {
    const line = statement.replace(/\n$/, '')
    return line ? knex.raw(line) : Promise.resolve()
  }))
}

function createTables () {
  const dbType = knex.client.config.client
  const filepath = path.resolve(
    __dirname, '..', 'sql', dbType, 'create.sql')

  const sql = fs.readFileSync(filepath, {encoding: 'utf8'})
  return executeStatements(knex, sql)
}

function dropTables () {
  const dbType = knex.client.config.client
  const filepath = path.resolve(
    __dirname, '..', 'sql', dbType, 'drop.sql')

  if (dbType === 'sqlite3') {
    return Promise.resolve()
  } else {
    const sql = fs.readFileSync(filepath, {encoding: 'utf8'})
    return executeStatements(knex, sql)
  }
}

function * truncateTables () {
  for (let t of tables) {
    if (knex.client.config.client === 'pg') {
      yield knex.raw('TRUNCATE TABLE "' + t + '" CASCADE;').then()
    } else {
      yield knex(t).truncate().then()
    }
  }
}

function * isConnected () {
  const query = 'SELECT 1'
  return knex.raw(query)
  .then(() => {
    return true
  })
  .catch(() => {
    return false
  })
}

module.exports = {
  createTables,
  dropTables,
  truncateTables,
  isConnected
}
