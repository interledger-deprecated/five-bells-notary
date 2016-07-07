'use strict'

module.exports = {
  CasesFactory,
  convertFromExternal,
  convertToExternal
}

const config = require('../lib/config')
const NotificationWorker = require('../lib/notificationWorker')
const CaseExpiryMonitor = require('../lib/caseExpiryMonitor')
const db = require('./db/case')
const getCaseByUuid = require('./db/case').getCaseByUuid
const upsertCase = require('./db/case').upsertCase
const cc = require('five-bells-condition')
const uri = require('../lib/uri')
const moment = require('moment')
const UnprocessableEntityError = require('five-bells-shared').UnprocessableEntityError
const UnmetConditionError = require('five-bells-shared').UnmetConditionError
const NotFoundError = require('five-bells-shared').NotFoundError
const InvalidBodyError = require('five-bells-shared/errors/invalid-body-error')
const validator = require('../lib/validator')
const _ = require('lodash')

function convertFromExternal (data) {
  // ID is optional on the incoming side
  const caseObject = {
    execution_condition: data.execution_condition,
    expires_at: new Date(data.expires_at),
    notaries: data.notaries,
    notification_targets: data.notification_targets,
    state: data.state
  }
  if (data.id) {
    caseObject.id = uri.parse(data.id, 'case').id.toLowerCase()
  }
  return caseObject
}

function convertToExternal (data) {
  return {
    id: uri.make('case', data.id.toLowerCase()),
    execution_condition: data.execution_condition,
    expires_at: moment(data.expires_at).toISOString(), // format('YYYY-MM-DD HH:mm:ss');
    notaries: data.notaries,
    notification_targets: data.notification_targets,
    state: data.state,
    exec_cond_fulfillment: data.exec_cond_fulfillment
  }
}

function isFinalized (caseObject) {
  return caseObject.state === 'executed' || caseObject.state === 'rejected'
}

CasesFactory.constitute = [NotificationWorker, CaseExpiryMonitor]
function CasesFactory (notificationWorker, caseExpiryMonitor) {
  return class Cases {

    static * getCase (caseId) {
      const item = yield getCaseByUuid(caseId)
      if (!item) {
        throw new NotFoundError('Case ' + caseId + ' not found')
      }
      return convertToExternal(item)
    }

    static * putCase (externalCase) {
      const validationResult = validator.create('Case')(externalCase)
      if (validationResult.valid !== true) {
        const message = validationResult.schema
          ? 'Body did not match schema ' + validationResult.schema
          : 'Body did not pass validation'
        throw new InvalidBodyError(message, validationResult.errors)
      }
      const caseInstance = convertFromExternal(externalCase)
      caseExpiryMonitor.validateNotExpired(caseInstance)
      caseInstance.state = 'proposed'
      if (caseInstance.notaries.length !== 1) {
        throw new UnprocessableEntityError(
          'The case must contain exactly one notary (this notary)')
      } else if (caseInstance.notaries[0] !==
                 config.getIn(['server', 'base_uri'])) {
        throw new UnprocessableEntityError(
          'The notary in the case must match this notary ' +
          `(expected: "${config.getIn(['server', 'base_uri'])}", ` +
          `actual: '${caseInstance.notaries[0]}')`)
      }

      const existed = yield upsertCase(caseInstance)
      yield caseExpiryMonitor.watch(caseInstance)
      return {caseData: convertToExternal(caseInstance), existed}
    }

    static * fulfillCase (caseId, fulfillment) {
      return yield db.transaction(function * (transaction) {
        const caseInstance = yield getCaseByUuid(caseId, {transaction})
        if (!caseInstance) {
          throw new UnprocessableEntityError('Unknown case ID ' + caseId)
        } else if (caseInstance.state === 'rejected') {
          throw new UnprocessableEntityError(
            'Case ' + caseId + ' is already rejected')
        } else {
          try {
            cc.validateFulfillment(fulfillment, caseInstance.execution_condition)
          } catch (err) {
            throw new UnmetConditionError('Invalid fulfillment: ' + err.toString())
          }
        }

        caseExpiryMonitor.validateNotExpired(caseInstance)

        if (caseInstance.state !== 'executed') {
          caseInstance.state = 'executed'
          caseInstance.exec_cond_fulfillment = fulfillment
          yield db.updateCase(caseInstance, {transaction})
          yield notificationWorker.queueNotifications(caseInstance, transaction)
        }
        return convertToExternal(caseInstance)
      })
    }

    static * addNotificationTarget (caseId, targetUris) {
      return yield db.transaction(function * (transaction) {
        const caseInstance = yield db.getCaseByUuid(caseId, {transaction})
        if (!caseInstance) {
          throw new UnprocessableEntityError('Unknown case ID ' + caseId)
        } else if (isFinalized(caseInstance)) {
          throw new UnprocessableEntityError(
            'Case ' + caseId + ' is already finalized')
        }

        caseInstance.notification_targets =
          _.union(caseInstance.notification_targets, targetUris)

        yield db.updateCase(caseInstance, {transaction})

        return convertToExternal(caseInstance)
      })
    }
  }
}
