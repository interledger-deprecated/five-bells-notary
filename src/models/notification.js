'use strict'

module.exports = NotificationFactory

const Container = require('constitute').Container
const Model = require('five-bells-shared').Model
const PersistentModelMixin = require('five-bells-shared').PersistentModelMixin
const Database = require('../lib/db')
const Sequelize = require('sequelize')
const CaseFactory = require('./case')

NotificationFactory.constitute = [Container, Database, CaseFactory]
function NotificationFactory (container, sequelize, Case) {
  class Notification extends Model {
    static convertFromPersistent (data) {
      delete data.created_at
      delete data.updated_at
      return data
    }
  }

  PersistentModelMixin(Notification, sequelize, {
    case_id: Sequelize.UUID,
    transfer: Sequelize.TEXT
  }, {
    indexes: [{
      unique: true,
      fields: ['case_id']
    }]
  })

  Notification.DbModel.belongsTo(Case.DbModel)

  return Notification
}
