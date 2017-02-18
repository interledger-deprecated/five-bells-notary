'use strict'

const cc = require('five-bells-condition')
const config = require('../../src/lib/config')
const makeCaseAttestation = require('five-bells-shared/utils/makeCaseAttestation')

const getKeyCondition = exports.getKeyCondition = () => {
  const keyCondition = new cc.Ed25519Sha256()
  keyCondition.setPublicKey(new Buffer(config.getIn(['keys', 'ed25519', 'public']), 'base64'))
  return keyCondition.getConditionUri()
}

exports.getExecutionCondition = (caseObj) => {
  const notaryCondition = new cc.PrefixSha256()
  notaryCondition.setSubconditionUri(getKeyCondition())
  notaryCondition.setPrefix(new Buffer(makeCaseAttestation(caseObj.id, 'executed'), 'utf8'))
  const executionCondition = new cc.ThresholdSha256()
  executionCondition.addSubcondition(notaryCondition.getCondition())
  executionCondition.addSubconditionUri(caseObj.execution_condition)
  executionCondition.setThreshold(2)

  return executionCondition.getConditionUri()
}

exports.getCancellationCondition = (caseObj) => {
  const notaryCondition = new cc.PrefixSha256()
  notaryCondition.setSubconditionUri(getKeyCondition())
  notaryCondition.setPrefix(new Buffer(makeCaseAttestation(caseObj.id, 'rejected'), 'utf8'))
  return notaryCondition.getConditionUri()
}
