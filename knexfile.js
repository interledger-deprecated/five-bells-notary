'use strict'

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
  // Set environment variables NOTARY_DB_ENV=oracledev
  // and DYLD_LIBRARY_PATH='/opt/oracle/instantclient' to use Oracle
  oracledev: {
    'debug': true,
    'client': 'strong-oracle',
    'connection': {
      database: '',
      hostname: '192.168.99.100:49161/', // Set this to IP address Oracle Docker is on
      user: 'system', // Use system user ONLY FOR TESTING
      password: 'oracle',
      adapter: 'oracle'
    },
    pool: {
      min: 0,
      max: 7
    },
    'migrations': {
      directory: __dirname + '/migrations'
    }
  }
}
