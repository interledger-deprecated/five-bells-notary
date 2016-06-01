'use strict'

const knex = require('../../lib/knex').knex
const assert = require('assert')

const TABLE_NAME = 'N_LU_CASE_STATUS'

const idToName = new Map()
const nameToId = new Map()

function readStatusCodes () {
  return knex(TABLE_NAME)
    .select()
    .then((rows) => {
      rows.forEach((row) => {
        idToName.set(row.CASE_STATUS_ID, row.NAME)
        nameToId.set(row.NAME, row.CASE_STATUS_ID)
      })
    })
}

function getStatusName (statusId) {
  assert(idToName.has(statusId), 'Unable to find status name for id ' +
     statusId + ' in ' + TABLE_NAME)
  return idToName.get(statusId)
}

function getStatusId (statusName) {
  assert(nameToId.has(statusName), 'Unable to find status name ' +
     statusName + ' in ' + TABLE_NAME)
  return nameToId.get(statusName)
}

module.exports = {
  readStatusCodes,
  getStatusId,
  getStatusName
}
