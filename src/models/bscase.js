'use strict';

var knex = require('knex') ({
  'client': 'sqlite3',
  'debug': true,
  'connection': {
    filename: 'sqlite.db'
  }
});
const bookshelf = require ('bookshelf')(knex);

const Case = bookshelf.Model.extend({
  tableName: 'bscases'
});

module.exports = Case;
