'use strict'

module.exports = CaseNotaryFactory

const Model = require('five-bells-shared').Model
const PersistentModelMixin = require('five-bells-shared').PersistentModelMixin
const UriManager = require('../../lib/uri')
const Database = require('../../lib/db')
const Sequelize = require('sequelize')

CaseNotaryFactory.constitute = [Database, UriManager]
function CaseNotaryFactory (sequelize, uri) {
  class CaseNotary extends Model {
    static convertFromExternal (data) {
      return data
    }

    static convertToExternal (data) {
      return data
    }

    static convertFromDatabase (data) {
      delete data.created_at
      delete data.updated_at
      return data
    }

    static convertToDatabase (data) {
      return data
    }
  }

  PersistentModelMixin(CaseNotary, sequelize, {
    case_id: {
      type: Sequelize.UUID,
      unique: 'case_notary'
    },
    notary_id: {
      type: Sequelize.INTEGER,
      unique: 'case_notary'
    }
  })

  return CaseNotary
}
