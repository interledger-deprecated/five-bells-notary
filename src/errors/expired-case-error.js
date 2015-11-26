'use strict'

const UnprocessableEntityError = require('five-bells-shared').UnprocessableEntityError

class ExpiredCaseError extends UnprocessableEntityError {
  constructor (message, accountIdentifier) {
    super(message)
    this.accountIdentifier = accountIdentifier
  }

  * handler (ctx, log) {
    log.warn('Expired Case: ' + this.message)
    ctx.status = 422
    ctx.body = {
      id: this.name,
      message: this.message,
      owner: this.accountIdentifier
    }
  }
}

module.exports = ExpiredCaseError
