'use strict'

module.exports = CaseFactory

const Container = require('constitute').Container
const Model = require('five-bells-shared').Model
const UriManager = require('../../lib/uri')
const Database = require('../../lib/db')
const config = require('../../lib/config')
const PersistentKnexModelMixin = require('five-bells-shared').PersistentKnexModelMixin
const Validator = require('five-bells-shared/lib/validator')
const knex = require('../../lib/knex').knex
const moment = require('moment')

CaseFactory.constitute = [Database, UriManager, Validator, Container]
function CaseFactory (sequelize, uri, validator, container) {
  class Case extends Model {
    static convertFromExternal (data) {
      // ID is optional on the incoming side
      if (data.id) {
        data.id = uri.parse(data.id, 'case').id.toLowerCase()
      }

      data.expires_at = new Date(data.expires_at)

      return data
    }

    static convertToExternal (data) {
      data.id = uri.make('case', data.id.toLowerCase())
      data.notaries = [config.getIn(['server', 'base_uri'])]
      data.expires_at = moment(data.expires_at).toISOString() // format('YYYY-MM-DD HH:mm:ss');
      delete data.Notaries
      if (!data.exec_cond_fulfillment) {
        delete data.exec_cond_fulfillment
      }
      return data
    }

    static convertFromPersistent (data) {
      data.execution_condition = JSON.parse(data.execution_condition)
      if (data.exec_cond_fulfillment) {
        data.exec_cond_fulfillment = JSON.parse(data.exec_cond_fulfillment)
      }
      data.notification_targets = JSON.parse(data.notification_targets)
      delete data.created_at
      delete data.updated_at
      if (!Array.isArray(data.notaries)) {
        data.notaries = [ data.notaries ]
      }
      return data
    }

    static convertToPersistent (data) {
      data.execution_condition = JSON.stringify(data.execution_condition)
      data.exec_cond_fulfillment = JSON.stringify(data.exec_cond_fulfillment)
      data.notification_targets = JSON.stringify(data.notification_targets)
      data.notaries = data.notaries[0]
      return data
    }
  }

  Case.validateExternal = validator.create('Case')
  Case.tableName = 'cases'

  PersistentKnexModelMixin(Case, knex)

  return Case
}
