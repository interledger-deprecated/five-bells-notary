'use strict'

exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.createTable('cases', function (table) {
      table.varchar('id', 40).primary()
      table.varchar('execution_condition', 1024).nullable()
      table.varchar('exec_cond_fulfillment', 1024).nullable()
      table.dateTime('expires_at', false).nullable()
      table.varchar('notaries', 1024).nullable()
      table.varchar('notification_targets', 1024).nullable()
      table.varchar('state', 16).nullable()
      // table.timestamps()
    }),
    knex.schema.createTable('notifications', function (table) {
      table.increments()
      table.varchar('case_id', 40)
      table.varchar('notification_target', 1024)
      table.integer('retry_count')
      table.dateTime('retry_at', false)
      // table.timestamps()
    })
  ])
}

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.schema.dropTableIfExists('cases'),
    knex.schema.dropTableIfExists('notifications')
  ])
}
