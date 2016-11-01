'use strict'

const expect = require('chai').expect
const appHelper = require('./helpers/app')
const logHelper = require('./helpers/log')
const log = require('../src/lib/log')

const Container = require('constitute').Container
const container = new Container()

beforeEach(function * () {
  appHelper.create(this, container)
})

describe('Metadata', function () {
  logHelper(log)

  describe('GET /', function () {
    it('should return metadata', function * () {
      yield this.request()
        .get('/')
        .expect(200)
        .expect(function (res) {
          expect(res.body).to.deep.equal({
            urls: {
              health: 'http://localhost/health',
              case: 'http://localhost/cases/:id',
              case_fulfillment: 'http://localhost/cases/:id/fulfillment'
            }
          })
        })
        .end()
    })
  })
})
