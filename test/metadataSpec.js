'use strict'

const expect = require('chai').expect
const appHelper = require('./helpers/app')
const logHelper = require('five-bells-shared/testHelpers/log')
const Log = require('../src/lib/log')

const Container = require('constitute').Container
const container = new Container()
const logger = container.constitute(Log)

beforeEach(function *() {
  appHelper.create(this, container)
})

describe('Metadata', function () {
  logHelper(logger)

  describe('GET /', function () {
    it('should return metadata', function *() {
      yield this.request()
        .get('/')
        .expect(200)
        .expect(function (res) {
          expect(res.body).to.deep.equal({
            urls: {
              health: '/health',
              case: '/cases/:id',
              case_fulfillment: '/cases/:id/fulfillment'
            }
          })
        })
        .end()
    })
  })
})
