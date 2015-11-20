'use strict'

const constitute = require('constitute')
const App = require('./src/lib/app')

if (!module.parent) {
  constitute(App).start()
}
