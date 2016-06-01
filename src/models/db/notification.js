'use strict'

const knex = require('../../lib/knex').knex
const _ = require('lodash')
const getStatusId = require('./notificationStatus').getStatusId
const getStatusName = require('./notificationStatus').getStatusName

const TABLE_NAME = 'N_NOTIFICATIONS'

function getTransaction (options) {
  return !options ? knex : (!options.transaction ? knex : options.transaction)
}

function * insertNotifications (notificationObjects, options) {
  if (notificationObjects.length <= 0) {
    return
  }
  return getTransaction(options)(TABLE_NAME)
    .insert(_.map(notificationObjects, convertToPersistent)).then()
}

function insertNotification (notificationObject, options) {
  return getTransaction(options)(TABLE_NAME).insert(convertToPersistent(notificationObject)).then()
}

function updateNotification (notificationObject, options) {
  return getTransaction(options)(TABLE_NAME).update(convertToPersistent(notificationObject))
    .where('NOTIFICATION_ID', notificationObject.notification_id)
    .then()
}

function getEarliestNotification () {
  return knex(TABLE_NAME)
    .select()
    .whereNot('NEXT_RETRY_DTTM', null)
    .andWhere('IS_ACTIVE', 1)
    .orderBy('NEXT_RETRY_DTTM', 'ASC')
    .limit(1)
    .then((results) => results.map(convertFromPersistent))
    .then((results) => {
      return results[0]
    })
}

function getReadyNotifications () {
  return knex(TABLE_NAME)
    .select()
    .where('NEXT_RETRY_DTTM', null)
    .orWhere('NEXT_RETRY_DTTM', '<', new Date(Date.now() + 100))
    .andWhere('IS_ACTIVE', 1)
    .then((results) => results.map(convertFromPersistent))
}

function convertFromPersistent (data) {
  const statusName = getStatusName(data.STATUS_ID)
  return {
    notification_id: data.NOTIFICATION_ID,
    state: statusName,
    case_id: data.CASE_ID,
    notification_target: data.TARGET,
    retry_count: data.RETRY_COUNT,
    retry_at: data.NEXT_RETRY_DTTM,
    is_active: Boolean(data.IS_ACTIVE)
  }
}

function convertToPersistent (data) {
  const statusId = getStatusId(data.state)
  const persistentNotification = {
    STATUS_ID: statusId,
    NEXT_RETRY_DTTM: data.retry_at,
    CASE_ID: data.case_id,
    TARGET: data.notification_target,
    RETRY_COUNT: data.retry_count,
    IS_ACTIVE: +data.is_active
  }
  if (data.notification_id) {
    persistentNotification.NOTIFICATION_ID = data.notification_id
  }
  return persistentNotification
}

module.exports = {
  insertNotifications,
  insertNotification,
  updateNotification,
  getEarliestNotification,
  getReadyNotifications,
  TABLE_NAME
}
