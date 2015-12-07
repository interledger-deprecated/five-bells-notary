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
const TimerWorker = require('../src/lib/timerWorker')

const Container = require('constitute').Container
const container = new Container()

const START_DATE = 1434412800000 // June 16, 2015 00:00:00 GMT

describe('Cases', function () {
  const logger = container.constitute(Log)
  const db = container.constitute(DB)
  const notificationWorker = container.constitute(NotificationWorker)
  const timerWorker = container.constitute(TimerWorker)
  const Case = container.constitute(CaseFactory)
  logHelper(logger)

  beforeEach(function *() {
    appHelper.create(this, container)

    yield db.dropAllSchemas()
    yield db.sync()

    this.clock = sinon.useFakeTimers(START_DATE, 'Date', 'setTimeout', 'setImmediate')

    this.cases = _.cloneDeep(require('./data/cases'))
    yield Case.bulkCreateExternal(_.values(this.cases))

    this.basicCase = _.cloneDeep(require('./data/basicCase'))
    this.exampleFulfillment = _.cloneDeep(require('./data/exampleFulfillment'))
  })

  describe('GET /cases/:id', function () {
    it('should return 200', function *() {
      yield this.request()
        .get(this.cases.simple.id)
        .expect(200)
        .expect(this.cases.simple)
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

    it('should return 422 if no notary is provided', function *() {
      this.basicCase.notaries = []
      yield this.request()
        .put(this.basicCase.id)
        .send(this.basicCase)
        .expect(422)
        .expect({
          id: 'UnprocessableEntityError',
          message: 'The case must contain exactly one notary (this notary)'
        })
        .end()
    })

    it('should return 422 if the incorrect notary is provided', function *() {
      this.basicCase.notaries[0].url = 'http://example.com'
      yield this.request()
        .put(this.basicCase.id)
        .send(this.basicCase)
        .expect(422)
        .expect({
          id: 'UnprocessableEntityError',
          message: 'The notary in the case must match this notary (expected: "http://localhost", actual: "http://example.com")'
        })
        .end()
    })
  })

  describe('PUT /cases/:id/fulfillment', function () {
    it('should return 200 when fulfilling a case', function *() {
      const exampleCase = this.cases.simple

      exampleCase.execution_condition_fulfillment = this.exampleFulfillment
      exampleCase.state = 'executed'

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .expect(exampleCase)
        .end()
    })

    it('should return 422 when a case is already rejected', function *() {
      const exampleCase = this.cases.rejected
      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(422)
        .expect({
          id: 'UnprocessableEntityError',
          message: 'Case ba18fbe6-a520-40bd-b5ac-02c9ccebbbdc is already rejected'
        })
        .end()
    })

    it('should return 422 when a case has expired', function *() {
      const exampleCase = this.cases.expired
      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(422)
        .expect({
          id: 'ExpiredCaseError',
          message: 'Cannot modify case after expires_at date'
        })
        .end()
    })

    it('should return 422 when an invalid fulfillment is sent', function *() {
      const exampleCase = this.cases.simple

      exampleCase.execution_condition_fulfillment = this.exampleFulfillment
      exampleCase.state = 'executed'

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send({
          type: 'sha256',
          message: 'foo'
        })
        .expect(422)
        .expect({
          id: 'UnmetConditionError',
          message: 'Invalid execution_condition_fulfillment'
        })
        .end()
    })

    it('should notify transfers when fulfilling a case', function *() {
      const exampleCase = this.cases.notification

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
      const exampleCase = this.cases.other

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

  describe('case notifications', function () {
    it('notifies on case expiration', function *() {
      const exampleCase = this.basicCase
      exampleCase.id = 'http://localhost/cases/75159fb1-8ed2-4c92-9af7-0f48e2616f48'
      exampleCase.expires_at = (new Date(Date.now() + 1000)).toISOString()
      exampleCase.transfers = ['http://ledger.example/transfers/123']
      yield this.request()
        .put(exampleCase.id)
        .send(exampleCase)
        .expect(201)
        .end()

      const getNotification = nock('http://ledger.example')
        .get('/transfers/123')
        .reply(200, { id: 'http://ledger.example/transfers/123' })
      const putNotification = nock('http://ledger.example')
        .put('/transfers/123', function (body) {
          expect(body.cancellation_condition_fulfillment.type).to.equal('ed25519-sha512')
          expect(body.cancellation_condition_fulfillment.signature).to.be.a('string')
          return true
        })
        .reply(200)

      // Not done yet
      this.clock.tick(500)
      yield timerWorker.processTimeQueue()
      yield notificationWorker.processNotificationQueue()
      expect(getNotification.isDone()).to.equal(false)

      this.clock.tick(501)
      yield timerWorker.processTimeQueue()
      yield notificationWorker.processNotificationQueue()

      getNotification.done()
      putNotification.done()
    })
  })
})
