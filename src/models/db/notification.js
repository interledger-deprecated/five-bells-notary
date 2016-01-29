'use strict'

module.exports = NotificationFactory

const Container = require('constitute').Container
const Model = require('five-bells-shared').Model
const PersistentKnexModelMixin = require('five-bells-shared').PersistentKnexModelMixin
const CaseFactory = require('./case')
const knex = require('../../lib/knex').knex

NotificationFactory.constitute = [Container, CaseFactory]
function NotificationFactory (container, Case) {
  class Notification extends Model {
    static convertFromPersistent (data) {
      delete data.created_at
      delete data.updated_at
      return data
    }
  }

  Notification.tableName = 'notifications'

  PersistentKnexModelMixin(Notification, knex)

  return Notification
}
