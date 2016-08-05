'use strict'

const fs = require('fs')
const path = require('path')
const connection = require('./knex').config.connection
const spawn = require('child_process').spawn
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

function executeSQLPlus (sqlFilepath) {
  return new Promise((resolve, reject) => {
    const user = connection.user
    const password = connection.password
    const host = connection.host
    const port = connection.port
    const database = connection.database
    const login = user + '/' + password + '@' + host + ':' + port
    const url = login + (database ? '/' + database : '')
    const env = {
      LD_LIBRARY_PATH: '/opt/oracle/instantclient',
      DYLD_LIBRARY_PATH: '/opt/oracle/instantclient'
    }
    const command = '/opt/oracle/instantclient/sqlplus'
    const args = [url, '@' + sqlFilepath]
    const process = spawn(command, args, {env})
    process.on('close', (code) => {
      return code === 0 ? resolve() : reject('sqlplus exited with code ' + code)
    })
  })
}

function executeMSSQL (sqlFilepath) {
  return new Promise((resolve, reject) => {
    const command = path.join(__dirname, '../../node_modules/sql-cli/bin/mssql')
    const args = [
      '--user', connection.user,
      '--pass', connection.password,
      '--server', connection.host,
      '--port', (connection.port || 1433),
      '--database', connection.database,
      '--query', '.run ' + path.resolve(sqlFilepath)
    ]
    const env = {
      PATH: process.env.PATH
    }
    const childProcess = spawn(command, args, {env})
    childProcess.stderr.on('data', (data) => {
      console.error(data.toString('utf-8'))
    })
    childProcess.on('close', (code) => {
      return code === 0 ? resolve() : reject(
        new Error('mssql exited with code ' + code))
    })
    childProcess.on('error', reject)
  })
}

function createTables () {
  const dbType = knex.client.config.client
  const filepath = path.resolve(
    __dirname, '..', 'sql', dbType, 'create.sql')

  if (dbType === 'strong-oracle') {
    return executeSQLPlus(filepath)
  } else if (dbType === 'mssql') {
    return executeMSSQL(filepath)
  } else {
    const sql = fs.readFileSync(filepath, {encoding: 'utf8'})
    return executeStatements(knex, sql)
  }
}

function dropTables () {
  const dbType = knex.client.config.client
  const filepath = path.resolve(
    __dirname, '..', 'sql', dbType, 'drop.sql')

  if (dbType === 'strong-oracle') {
    return executeSQLPlus(filepath)
  } else if (dbType === 'mssql') {
    return executeMSSQL(filepath)
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
  const query = knex.client.config.client === 'strong-oracle'
    ? 'SELECT 1 FROM DUAL' : 'SELECT 1'
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
