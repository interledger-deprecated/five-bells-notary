'use strict'

const createTables = require('../../src/lib/db').createTables
const dropTables = require('../../src/lib/db').dropTables
const truncateTables = require('../../src/lib/db').truncateTables
const readLookupTables = require('../../src/lib/readLookupTables').readLookupTables

// Only run migrations once during tests
let init = false
exports.init = function * () {
  if (init) {
    return
  }

  yield createTables()
  yield readLookupTables()
  init = true
  return
}

exports.drop = function * () {
  yield dropTables()
}

exports.clean = function * () {
  yield truncateTables()
}
