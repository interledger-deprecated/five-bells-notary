'use strict'

const _ = require('lodash')
const nock = require('nock')
const expect = require('chai').expect
const sinon = require('sinon')
const cc = require('five-bells-condition')
const log = require('../src/lib/log')
const persistentCase = require('../src/models/db/case')
const convertFromExternal = require('../src/models/cases').convertFromExternal
const appHelper = require('./helpers/app')
const conditionHelper = require('./helpers/condition')
const logHelper = require('./helpers/log')
const NotificationWorker = require('../src/lib/notificationWorker')
const TimerWorker = require('../src/lib/timerWorker')

const Container = require('constitute').Container
const container = new Container()

const dbHelper = require('./helpers/db')

const START_DATE = 1434412800000 // June 16, 2015 00:00:00 GMT

describe('Cases', function () {
  logHelper(log)
  const notificationWorker = container.constitute(NotificationWorker)
  const timerWorker = container.constitute(TimerWorker)

  before(function * () {
    yield dbHelper.init()
  })

  after(function * () {
    yield dbHelper.drop()
  })

  beforeEach(function * () {
    appHelper.create(this, container)
    yield dbHelper.clean()

    const nockLog = log.create('nock')
    this.nockLogInfo = nockLog.info.bind(nockLog)

    this.clock = sinon.useFakeTimers(START_DATE, 'Date')

    this.cases = _.cloneDeep(require('./data/cases'))
    const caseObjects = _.mapValues(this.cases, convertFromExternal)

    yield persistentCase.insertCases(caseObjects)

    this.basicCase = _.cloneDeep(require('./data/basicCase'))
    this.exampleFulfillment = _.cloneDeep(require('./data/exampleFulfillment'))

    this.caseInvalidNotificationTargets = _.cloneDeep(require('./data/caseInvalidNotificationTargets'))
  })

  describe('GET /cases/:id', function () {
    it('should return 200', function * () {
      yield this.request()
        .get(this.cases.simple.id)
        .expect(200)
        .expect(this.cases.simple)
        .end()
    })

    it('should return 404 for a non-existent case', function * () {
      yield this.request()
        .get('/cases/da8e2a9f-fd41-4dda-99a9-87686a011f9a')
        .expect(404)
        .end()
    })
  })

  describe('PUT /cases/:id', function () {
    it('should return 201 when creating a case', function * () {
      yield this.request()
        .put(this.basicCase.id)
        .send(this.basicCase)
        .expect(201)
        .end()
    })

    it('should return 400 when notaries format is invalid', function * () {
      const caseInstance = _.clone(this.basicCase)
      caseInstance.notaries = [{url: caseInstance.notaries[0]}]
      yield this.request()
        .put(this.basicCase.id)
        .send(caseInstance)
        .expect(400)
        .end()
    })

    it('should return 400 when the notification_targets are not distinct', function * () {
      const caseInstance = _.cloneDeep(this.caseInvalidNotificationTargets)
      yield this.request()
        .put(caseInstance.id)
        .send(caseInstance)
        .expect(400)
        .end()
    })

    it('should return 400 when adding additional notification targets that are not distinct', function * () {
      const caseInstance = _.cloneDeep(this.basicCase)

      const additionalTargets = [caseInstance.notification_targets[0], caseInstance.notification_targets[0]]
      yield this.request()
        .put(caseInstance.id)
        .send(caseInstance)
        .expect(201)
        .end()

      yield this.request()
        .post(caseInstance.id + '/targets')
        .send(additionalTargets)
        .expect(400)
        .end()
    })

    it('should return a distinct list of notification targets', function * () {
      const caseInstance = _.cloneDeep(this.basicCase)

      const additionalTargets = caseInstance.notification_targets
      yield this.request()
        .put(caseInstance.id)
        .send(caseInstance)
        .expect(201)
        .end()

      yield this.request()
        .post(caseInstance.id + '/targets')
        .send(additionalTargets)
        .expect(200)
        .end()

      yield this.request()
        .get(caseInstance.id)
        .expect(200)
        .expect(_.assign(caseInstance, {
          state: 'proposed'
        }))
        .end()
    })

    it('should return 200 when adding same case twice', function * () {
      yield this.request()
        .put(this.basicCase.id)
        .send(this.basicCase)
        .expect(201)
        .end()
      yield this.request()
        .put(this.basicCase.id)
        .send(this.basicCase)
        .expect(200)
        .end()
    })

    it('should return 422 if no notary is provided', function * () {
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

    it('should return 422 if the incorrect notary is provided', function * () {
      this.basicCase.notaries[0] = 'http://example.com'
      yield this.request()
        .put(this.basicCase.id)
        .send(this.basicCase)
        .expect(422)
        .expect({
          id: 'UnprocessableEntityError',
          message: "The notary in the case must match this notary (expected: \"http://localhost\", actual: 'http://example.com')"
        })
        .end()
    })

    it('should return 422 if the case is already expired', function * () {
      const exampleCase = this.cases.expired
      yield this.request()
        .put(exampleCase.id)
        .send(exampleCase)
        .expect(422)
        .expect({
          id: 'ExpiredCaseError',
          message: 'Cannot create or modify case after expires_at date'
        })
        .end()
    })
  })

  describe('PUT /cases/:id/fulfillment', function () {
    it('should return 200 when fulfilling a case', function * () {
      const exampleCase = this.cases.simple

      exampleCase.exec_cond_fulfillment = this.exampleFulfillment
      exampleCase.state = 'executed'

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .expect(exampleCase)
        .end()
    })

    it('should return 422 when a case is already rejected', function * () {
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

    it('should return 422 when a case has expired', function * () {
      const exampleCase = this.cases.expired
      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(422)
        .expect({
          id: 'ExpiredCaseError',
          message: 'Cannot create or modify case after expires_at date'
        })
        .end()
    })

    it('should return 422 when an invalid fulfillment is sent', function * () {
      const exampleCase = this.cases.simple

      exampleCase.exec_cond_fulfillment = this.exampleFulfillment
      exampleCase.state = 'executed'

      const response = yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send('oAmAB2V4ZWNldGU')
        .expect(422)
        .end()

      const errorString = 'Invalid fulfillment: Error: Fulfillment does not match condition' +
                          ' (expected: ni:///sha-256;vmvf6B7EpFalN6RGDx9F4f4z0wtOIgsIdCmbgv06ceI?fpt=preimage-sha-256&cost=7, ' +
                          'actual: ni:///sha-256;nN793Gop06qyPccAIOCG_ROgIs5QghfQVU6fumRgyZ0?fpt=preimage-sha-256&cost=7)'
      expect(response.body.id).to.equal('UnmetConditionError')
      expect(response.body.message).to.equal(errorString)
    })

    it('should notify notification_targets when fulfilling a case', function * () {
      const exampleCase = this.cases.notification
      const executionCondition = conditionHelper.getExecutionCondition(exampleCase)

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .end()

      const putNotification = nock('http://ledger.example')
        .log(this.nockLogInfo)
        .put('/transfers/123/fulfillment', (body) => {
          expect(cc.validateFulfillment(body, executionCondition)).to.be.true

          return true
        })
        .reply(204)

      yield notificationWorker.processNotificationQueue()

      putNotification.done()
    })

    it('should retry failed notifications when fulfilling a case', function * () {
      const exampleCase = this.cases.other
      const executionCondition = conditionHelper.getExecutionCondition(exampleCase)

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .end()

      const putNotification1 = nock('http://ledger.example')
        .put('/transfers/123/fulfillment')
        .reply(500)
      const putNotification2 = nock('http://ledger.example')
        .log(this.nockLogInfo)
        .put('/transfers/123/fulfillment', (body) => {
          expect(cc.validateFulfillment(body, executionCondition)).to.be.true

          return true
        })
        .reply(204)

      // put fails
      yield notificationWorker.processNotificationQueue()
      putNotification1.done()
      expect(putNotification2.isDone()).to.equal(false)
      this.clock.tick(500)

      // Not ready to retry yet (backoff in effect)
      yield notificationWorker.processNotificationQueue()
      expect(putNotification2.isDone()).to.equal(false)
      this.clock.tick(2501)

      // Success
      yield notificationWorker.processNotificationQueue()
      putNotification2.done()
    })

    it('should NOT retry failed notifications when fulfilling a case -- 404', function * () {
      const exampleCase = this.cases.other
      // const executionCondition = conditionHelper.getExecutionCondition(exampleCase)
      const statusCode = 404

      const putNotification1 = nock('http://ledger.example')
        .put('/transfers/123/fulfillment')
        .reply(statusCode)

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .end()

      // put fails
      yield notificationWorker.processNotificationQueue()
      putNotification1.done()
      this.clock.tick(500)

      // Not ready to retry yet (backoff in effect)
      yield notificationWorker.processNotificationQueue()
      this.clock.tick(2501)
      yield notificationWorker.processNotificationQueue()
      expect(nock.isDone()).to.equal(true)
    })

    it('should retry failed notifications when fulfilling a case -- 422', function * () {
      const exampleCase = this.cases.other
      const executionCondition = conditionHelper.getExecutionCondition(exampleCase)
      const statusCode = 422

      yield this.request()
        .put(exampleCase.id + '/fulfillment')
        .send(this.exampleFulfillment)
        .expect(200)
        .end()

      const putNotification1 = nock('http://ledger.example')
        .put('/transfers/123/fulfillment')
        .reply(statusCode)
      const putNotification2 = nock('http://ledger.example')
        .log(this.nockLogInfo)
        .put('/transfers/123/fulfillment', (body) => {
          expect(cc.validateFulfillment(body, executionCondition)).to.be.true

          return true
        })
        .reply(204)

      // put fails
      yield notificationWorker.processNotificationQueue()
      putNotification1.done()
      expect(putNotification2.isDone()).to.equal(false)
      this.clock.tick(500)

      // Not ready to retry yet (backoff in effect)
      yield notificationWorker.processNotificationQueue()
      expect(putNotification2.isDone()).to.equal(false)
      this.clock.tick(2501)

      // Success
      yield notificationWorker.processNotificationQueue()
      putNotification2.done()
    })
  })

  describe('POST /cases/:id/targets', function () {
    it('should return 200 when successfully adding a new target', function * () {
      const exampleCase = this.cases.other

      yield this.request()
        .post(exampleCase.id + '/targets')
        .send(['http://new.example'])
        .expect(200)
        .expect(Object.assign({}, exampleCase, {
          notification_targets: [
            'http://ledger.example/transfers/123/fulfillment',
            'http://new.example'
          ]
        }))
        .end()
    })

    it('should return 400 when an invalid target is supplied', function * () {
      const exampleCase = this.cases.other

      const response = yield this.request()
        .post(exampleCase.id + '/targets')
        .send({foo: 'bar'})
        .expect(400)
        .end()

      expect(response.body.id).to.equal('InvalidBodyError')
    })
  })

  describe('case notifications', function () {
    it('notifies on case expiration', function * () {
      const exampleCase = this.basicCase
      exampleCase.id = 'http://localhost/cases/75159fb1-8ed2-4c92-9af7-0f48e2616f48'
      exampleCase.expires_at = (new Date(Date.now() + 1000)).toISOString()
      exampleCase.notification_targets = ['http://ledger.example/transfers/123/fulfillment']

      const cancellationCondition = conditionHelper.getCancellationCondition(exampleCase)

      yield this.request()
        .put(exampleCase.id)
        .send(exampleCase)
        .expect(201)
        .end()

      const putNotification = nock('http://ledger.example')
        .put('/transfers/123/fulfillment', function (body) {
          expect(cc.validateFulfillment(body, cancellationCondition)).to.be.true

          return true
        })
        .reply(200)

      // Not done yet
      this.clock.tick(500)
      yield timerWorker.processTimeQueue()
      yield notificationWorker.processNotificationQueue()
      expect(putNotification.isDone()).to.equal(false)

      this.clock.tick(501)
      yield timerWorker.processTimeQueue()
      yield notificationWorker.processNotificationQueue()

      putNotification.done()

      yield this.request()
        .get(exampleCase.id)
        .expect(200)
        .expect(_.assign({}, exampleCase, {
          notaries: [
            'http://localhost'
          ]
        }, {
          state: 'rejected'
        }))
        .end()
    })
  })
})
