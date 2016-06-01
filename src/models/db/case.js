'use strict'

const knex = require('../../lib/knex').knex
const _ = require('lodash')
const co = require('co')
const assert = require('assert')
const getStatusId = require('./caseStatus').getStatusId
const getStatusName = require('./caseStatus').getStatusName

const TABLE_NAME = 'N_CASES'

function getTransaction (options) {
  return !options ? knex : (!options.transaction ? knex : options.transaction)
}

function transaction (callback) {
  return knex.transaction(co.wrap(callback))
}

function * insertCases (caseObjects, options) {
  if (caseObjects.length <= 0) {
    return
  }
  return getTransaction(options)(TABLE_NAME)
  .insert(_.map(caseObjects, convertToPersistent)).then()
}

function insertCase (caseObject, options) {
  return getTransaction(options)(TABLE_NAME)
    .insert(convertToPersistent(caseObject))
    .then()
}

function updateCase (caseObject, options) {
  assert(caseObject.primary_key, 'Cannot update a case without a primary key: ' +
    JSON.stringify(caseObject))
  return getTransaction(options)(TABLE_NAME).update(convertToPersistent(caseObject))
  .where('CASE_ID', caseObject.primary_key)
  .then()
}

function * _upsertCase (caseData, options) {
  assert(options.transaction)
  const existingCase = yield getCaseByUuid(caseData.id, options)
  if (existingCase) {
    yield updateCase(_.merge({}, existingCase, caseData), options)
  } else {
    yield insertCase(caseData, options)
  }
  return Boolean(existingCase)
}

function * upsertCase (caseData, options) {
  if (options && options.transaction) {
    return yield _upsertCase(caseData, options)
  } else {
    let result
    yield transaction(function * (transaction) {
      result = yield _upsertCase(caseData,
        _.assign({}, options || {}, {transaction}))
    })
    return result
  }
}

function getByKey (key, value, options) {
  return getTransaction(options)
    .from(TABLE_NAME)
    .select()
    .where(key, value)
    .then((results) => results.map(convertFromPersistent))
    .then((results) => {
      if (results.length === 1) {
        return results[0]
      } else if (results.length === 0) {
        return null
      } else {
        assert(false,
          results.length + ' cases with ' + key + ':' + value)
      }
    })
}

function getCaseByPrimaryKey (primaryKey, options) {
  return getByKey('CASE_ID', primaryKey, options)
}

function getCaseByUuid (caseUuid, options) {
  return getByKey('UUID', caseUuid, options)
}

function convertFromPersistent (data) {
  const statusName = getStatusName(data.STATUS_ID)
  const caseObject = {
    primary_key: data.CASE_ID,
    id: data.UUID,
    execution_condition: data.EXECUTION_CONDITION_DIGEST,
    expires_at: data.EXPIRES_DTTM,
    notification_targets: JSON.parse(data.NOTIFICATION_TARGETS),
    state: statusName
  }
  if (!Array.isArray(data.NOTARIES)) {
    caseObject.notaries = [ data.NOTARIES ]
  }
  if (data.EXEC_COND_FULFILLMENT) {
    caseObject.exec_cond_fulfillment = data.EXEC_COND_FULFILLMENT
  }
  return caseObject
}

function convertToPersistent (data) {
  const statusId = getStatusId(data.state)
  const persistentCase = {
    UUID: data.id,
    STATUS_ID: statusId,
    EXECUTION_CONDITION_DIGEST: data.execution_condition,
    EXEC_COND_FULFILLMENT: data.exec_cond_fulfillment,
    EXPIRES_DTTM: data.expires_at,
    NOTARIES: data.notaries[0],
    NOTIFICATION_TARGETS: JSON.stringify(data.notification_targets)
  }
  if (data.primary_key) {
    persistentCase.CASE_ID = data.primary_key
  }
  return persistentCase
}

module.exports = {
  getCaseByUuid,
  getCaseByPrimaryKey,
  insertCases,
  insertCase,
  updateCase,
  upsertCase,
  transaction
}
