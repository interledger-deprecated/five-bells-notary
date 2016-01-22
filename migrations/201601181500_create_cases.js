'use strict';

exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('bscases', function(table) {
      //table.increments();
      //table.varchar('uuid', 40).primary();
      table.varchar('uuid', 40).index();
      table.varchar('execution_condition', 1024);
      table.dateTime('expires_at', true);
      table.varchar('notaries', 4096);
      table.varchar('targets', 1024);
      table.varchar('state', 16);
      table.timestamps();
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('bscases')
  ]);
};
