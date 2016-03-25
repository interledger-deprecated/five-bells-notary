'use strict'

const _ = require('lodash')
const assert = require('assert')
const co = require('co')
const knex = require('../../lib/knex').knex

function transaction (callback) {
  return knex.transaction(co.wrap(callback))
}

function * getCase (Case, caseId, options) {
  return yield Case.findById(caseId, options)
}

function * _upsertCase (Case, caseData, options) {
  assert(options.transaction)
  // SQLite's implementation of upsert does not tell you whether it created the
  // row or whether it already existed. Since we need to know to return the
  // correct HTTP status code we unfortunately have to do this in two steps.
  const existingCase = yield Case.findById(caseData.id, options)
  if (existingCase) {
    existingCase.setData(caseData)
    yield existingCase.save(options)
  } else {
    yield Case.create(caseData, options)
  }
  return Boolean(existingCase)
}

function * upsertCase (Case, caseData, options) {
  if (options && options.transaction) {
    return yield _upsertCase(Case, caseData, options)
  } else {
    let result
    yield transaction(function * (transaction) {
      result = yield _upsertCase(Case, caseData,
        _.assign({}, options || {}, {transaction}))
    })
    return result
  }
}

function * updateCase (caseInstance, options) {
  yield caseInstance.save(options)
}

module.exports = {
  getCase,
  updateCase,
  upsertCase,
  transaction
}
