'use strict'

const constitute = require('constitute')
const App = require('./src/lib/app')

function exitHandler (knex, options, error) {
  if (error) {
    console.error('Exiting ', error.stack)
    knex.destroy().then(() => process.exit(1))
  } else if (options.exit) {
    knex.destroy().then(() => process.exit(0))
  }
}

if (!module.parent) {
  const knex = require('./src/lib/knex').knex

  // SIGINT and uncaughtException do not run cleanup
  // so we have an exitHandler to clean up the database connection
  // https://github.com/tgriesser/knex/blob/a3a81982d8eb4df69de37f6c42f27de9138582b9/index.html#L543-L544
  process.on('SIGINT', (err) => exitHandler(knex, err, {exit: true}))
  process.on('uncaughtException', (err) => exitHandler(knex, err, {exit: true}))

  constitute(App).start()
}
