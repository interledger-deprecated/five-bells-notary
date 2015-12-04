'use strict'

const _ = require('lodash')
const Log = require('../src/lib/log')
const DB = require('../src/lib/db')
const CaseFactory = require('../src/models/case')
const appHelper = require('./helpers/app')
const logHelper = require('five-bells-shared/testHelpers/log')

const Container = require('constitute').Container
const container = new Container()

describe('Cases', function () {
  const logger = container.constitute(Log)
  const db = container.constitute(DB)
  const Case = container.constitute(CaseFactory)
  logHelper(logger)

  beforeEach(function *() {
    appHelper.create(this, container)

    yield db.dropAllSchemas()
    yield db.sync()

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
          id: 'UnprocessableEntityError',
          message: 'Case ba18fbe6-a520-40bd-b5ac-02c9ccebbbdd is already rejected'
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
  })
})
