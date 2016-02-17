'use strict'

const path = require('path')
const reSqlite = /^sqlite:\/\//
const dbURI = process.env.NOTARY_DB_URI
let sqliteFilename = 'sqlite.db'
if (reSqlite.test(dbURI)) {
  sqliteFilename = dbURI.replace(reSqlite, '')
}

module.exports = {
  // sqlite
  development: {
    'client': 'sqlite3',
    'connection': {
      'filename': sqliteFilename
    }
  },
  // Test with Oracle on Mac
  // Set environment variables
  // NOTARY_DB_ENV=oracledev DYLD_LIBRARY_PATH='/opt/oracle/instantclient'
  oracledev: {
    'debug': true,
    'client': 'strong-oracle',
    'connection': {
      database: '',
      hostname: '192.168.99.100:49161/', // Set this to IP or hostname Oracle Docker is on
      user: 'system', // Use system user ONLY FOR TESTING
      password: 'oracle',
      adapter: 'oracle'
    },
    pool: {
      min: 0,
      max: 7
    },
    'migrations': {
      directory: path.join(__dirname, '/migrations')
    }
  },
  // Test with Oracle on Linux (e.g. on CircleCI)
  // Set environment variables
  // NOTARY_DB_ENV=oracledci LD_LIBRARY_PATH='/opt/oracle/instantclient'
  oracleci: {
    'debug': true,
    'client': 'strong-oracle',
    'connection': {
      database: '',
      hostname: 'localhost:49161/', // Set this to IP or hostname Oracle Docker is on
      user: 'system', // Use system user ONLY FOR TESTING
      password: 'oracle',
      adapter: 'oracle'
    },
    pool: {
      min: 0,
      max: 7
    },
    'migrations': {
      directory: path.join(__dirname, '/migrations')
    }
  }
}
