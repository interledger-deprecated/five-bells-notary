'use strict'

module.exports = NotaryFactory

const Container = require('constitute').Container
const Model = require('five-bells-shared').Model
const PersistentModelMixin = require('five-bells-shared').PersistentModelMixin
const UriManager = require('../lib/uri')
const Database = require('../lib/db')
const Sequelize = require('sequelize')
const CaseFactory = require('./case')
const CaseNotaryFactory = require('./case-notary')

NotaryFactory.constitute = [Container, Database, UriManager]
function NotaryFactory (container, sequelize, uri) {
  class Notary extends Model {
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

  PersistentModelMixin(Notary, sequelize, {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    url: {
      type: Sequelize.TEXT
    }
  })

  container.schedulePostConstructor((Case, CaseNotary) => {
    Notary.DbModel.belongsToMany(Case.DbModel, {
      through: {
        model: CaseNotary.DbModel,
        unique: false
      },
      foreignKey: 'notary_id'
    })
  }, [ CaseFactory, CaseNotaryFactory ])

  return Notary
}
