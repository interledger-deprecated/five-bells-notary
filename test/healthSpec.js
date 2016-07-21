'use strict'

const nock = require('nock')
nock.enableNetConnect(['localhost', '127.0.0.1'])
const appHelper = require('./helpers/app')
const logHelper = require('./helpers/log')
const log = require('../src/lib/log')

const Container = require('constitute').Container
const container = new Container()

beforeEach(function * () {
  appHelper.create(this, container)
})

describe('Health', function () {
  logHelper(log)

  describe('GET /health', function () {
    it('should return 200', function * () {
      yield this.request()
        .get('/health')
        .expect(200)
        .end()
    })
  })
})
