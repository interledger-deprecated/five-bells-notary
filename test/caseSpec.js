'use strict'

const _ = require('lodash')
const nock = require('nock')
const expect = require('chai').expect
const sinon = require('sinon')
const Log = require('../src/lib/log')
const DB = require('../src/lib/db')
const CaseFactory = require('../src/models/case')
const appHelper = require('./helpers/app')
const logHelper = require('five-bells-shared/testHelpers/log')
const NotificationWorker = require('../src/lib/notificationWorker')

const Container = require('constitute').Container
const container = new Container()

const START_DATE = 1434412800000 // June 16, 2015 00:00:00 GMT

describe('Cases', function () {
  const logger = container.constitute(Log)
  const db = container.constitute(DB)
  const notificationWorker = container.constitute(NotificationWorker)
  const Case = container.constitute(CaseFactory)
  logHelper(logger)

  beforeEach(function *() {
    appHelper.create(this, container)

    yield db.dropAllSchemas()
    yield db.sync()

    this.clock = sinon.useFakeTimers(START_DATE, 'Date', 'setTimeout', 'setImmediate')

    this.cases = _.cloneDeep(require('./data/cases'))
    yield Case.bulkCreateExternal(this.cases)

    this.basicCase = _.cloneDeep(require('./data/basicCase'))
    this.exampleFulfillment = _.cloneDeep(require('./data/exampleFulfillment'))
  })

  describe('GET /cases/:id', function () {
    it('should return 200', function *() {
      yield this.request()
        .get(this.cases[0].id)
        .expect(200)
        .expect(this.cases[0])
        .end()
    })

    it('should return 404 for a non-existent case', function *() {
      yield this.request()
        .get('/cases/da8e2a9f-fd41-4dda-99a9-87686a011f9a')
        .expect(404)
        .end()
    })
  })

  describe('PUT /cases/:id', function () {
    it('should return 201 when creating a case', function *() {
      yield this.request()
        .put(this.basicCase.id)
        .send(this.basicCase)
        .expect(201)
        .end()
    })
  })

  describe('PUT /cases/:id/fulfillment', function () {
    it('should return 200 when fulfilling a case', function *() {
      const exampleCase = this.cases[0]

      exampleCase.execution_condition_fulfillment = this.exampleFulfillment
      exampleCase.state = 'executed'

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .expect(exampleCase)
        .end()
    })

    it('should notify transfers when fulfilling a case', function *() {
      const exampleCase = this.cases[1]

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .end()

      const getNotification = nock('http://ledger.example')
        .log(logger('nock').info)
        .get('/transfers/123')
        .reply(200, {
          id: 'http://ledger.example/transfers/123'
        })

      const putNotification = nock('http://ledger.example')
        .log(logger('nock').info)
        .put('/transfers/123', (body) => {
          // TODO Verify signature
          const caseFulfillment = body.execution_condition_fulfillment.subfulfillments[0]
          caseFulfillment.signature = ''

          expect(body).to.deep.equal({
            id: 'http://ledger.example/transfers/123',
            execution_condition_fulfillment: {
              type: 'and',
              subfulfillments: [{
                type: 'ed25519-sha512',
                signature: ''
              }, this.exampleFulfillment]
            }
          })
          return true
        })
        .reply(204)

      yield notificationWorker.processNotificationQueue()

      getNotification.done()
      putNotification.done()
    })

    it('should retry failed notifications when fulfilling a case', function *() {
      const exampleCase = this.cases[1]

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .end()

      const getNotification1 = nock('http://ledger.example')
        .log(logger('nock').info)
        .get('/transfers/123')
        .reply(500)
      const getNotification2 = nock('http://ledger.example')
        .log(logger('nock').info)
        .get('/transfers/123')
        .times(2)
        .reply(200, { id: 'http://ledger.example/transfers/123' })

      const putNotification1 = nock('http://ledger.example')
        .put('/transfers/123')
        .reply(500)
      const putNotification2 = nock('http://ledger.example')
        .log(logger('nock').info)
        .put('/transfers/123', (body) => {
          // TODO Verify signature
          const caseFulfillment = body.execution_condition_fulfillment.subfulfillments[0]
          caseFulfillment.signature = ''

          expect(body).to.deep.equal({
            id: 'http://ledger.example/transfers/123',
            execution_condition_fulfillment: {
              type: 'and',
              subfulfillments: [{
                type: 'ed25519-sha512',
                signature: ''
              }, this.exampleFulfillment]
            }
          })
          return true
        })
        .reply(204)

      // GET fails
      yield notificationWorker.processNotificationQueue()
      getNotification1.done()
      expect(putNotification1.isDone()).to.equal(false)
      this.clock.tick(500)

      // Not ready to retry yet (backoff in effect)
      yield notificationWorker.processNotificationQueue()
      expect(putNotification1.isDone()).to.equal(false)
      this.clock.tick(1501)

      // PUT fails
      yield notificationWorker.processNotificationQueue()
      putNotification1.done()
      expect(putNotification2.isDone()).to.equal(false)
      this.clock.tick(4001)

      // Success
      yield notificationWorker.processNotificationQueue()
      getNotification2.done()
      putNotification2.done()
    })
  })
})
