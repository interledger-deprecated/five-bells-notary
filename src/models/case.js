'use strict'

module.exports = CaseFactory

const Container = require('constitute').Container
const Model = require('five-bells-shared').Model
const PersistentModelMixin = require('five-bells-shared').PersistentModelMixin
const UriManager = require('../lib/uri')
const Database = require('../lib/db')
const Config = require('../lib/config')
const Validator = require('five-bells-shared/lib/validator')
const Sequelize = require('sequelize')
const NotaryFactory = require('./notary')
const CaseNotaryFactory = require('./case-notary')

CaseFactory.constitute = [Database, UriManager, Validator, Container, Config]
function CaseFactory (sequelize, uri, validator, container, config) {
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
      data.notaries = [config.server.base_uri]
      data.expires_at = data.expires_at.toISOString()
      delete data.Notaries
      if (!data.execution_condition_fulfillment) {
        delete data.execution_condition_fulfillment
      }
      return data
    }

    static convertFromPersistent (data) {
      data.execution_condition = JSON.parse(data.execution_condition)
      if (data.execution_condition_fulfillment) {
        data.execution_condition_fulfillment = JSON.parse(data.execution_condition_fulfillment)
      }
      data.actions = JSON.parse(data.actions);
      delete data.created_at
      delete data.updated_at
      return data
    }

    static convertToPersistent (data) {
      data.execution_condition = JSON.stringify(data.execution_condition)
      data.execution_condition_fulfillment = JSON.stringify(data.execution_condition_fulfillment)
      data.actions = JSON.stringify(data.actions);
      return data
    }
  }

  Case.validateExternal = validator.create('Case')

  PersistentModelMixin(Case, sequelize, {
    id: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    state: {
      type: Sequelize.ENUM('proposed', 'executed', 'rejected')
    },
    expires_at: {
      type: Sequelize.DATE
    },
    execution_condition: {
      type: Sequelize.TEXT
    },
    execution_condition_fulfillment: {
      type: Sequelize.TEXT
    },
    actions: {
      type: Sequelize.TEXT
    }
  })

  // We use a post constructor in order to avoid issues with circular
  // dependencies.
  container.schedulePostConstructor((Notary, CaseNotary) => {
    Case.DbModel.belongsToMany(Notary.DbModel, {
      through: {
        model: CaseNotary.DbModel,
        unique: false
      },
      foreignKey: 'case_id',
      constraints: false
    })
  }, [ NotaryFactory, CaseNotaryFactory ])

  return Case
}
