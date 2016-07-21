'use strict'

const Config = require('five-bells-shared').Config
const envPrefix = 'notary'

function isRunningTests () {
  return (
    process.env.NODE_ENV === 'unit' ||
    process.argv[0].endsWith('mocha') ||
    (process.argv.length > 1 && process.argv[0].endsWith('node') &&
     process.argv[1].endsWith('mocha'))
   )
}

function useTestConfig () {
  return !Config.castBool(process.env.UNIT_TEST_OVERRIDE) && isRunningTests()
}

function getLogLevel () {
  if (useTestConfig()) {
    return 'debug'
  } else {
    // https://github.com/trentm/node-bunyan#levels
    return Config.getEnv(envPrefix, 'LOG_LEVEL') || 'info'
  }
}

function getLocalConfig () {
  const logLevel = getLogLevel()
  return {
    logLevel
  }
}
module.exports = Config.loadConfig(envPrefix, getLocalConfig())
