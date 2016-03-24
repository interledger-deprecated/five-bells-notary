'use strict'

const moment = require('moment')
const defer = require('co-defer')
const TimeQueue = require('./timeQueue')
const CaseExpiryMonitor = require('./caseExpiryMonitor')
const Log = require('./log')

const MAX_32INT = 2147483647

class TimerWorker {
  static constitute () { return [ TimeQueue, CaseExpiryMonitor, Log ] }
  constructor (timeQueue, caseExpiryMonitor, log) {
    this.timeQueue = timeQueue
    this.caseExpiryMonitor = caseExpiryMonitor
    this.log = log('timerWorker')
    this.timeout = null
    this.listener = null
  }

  start () {
    const _this = this

    // Make sure we only have one listener waiting for new
    // items to be added to the timeQueue
    _this.listener = function * () {
      yield _this.processTimeQueue()
    }
    _this.timeQueue.on('insert', _this.listener)

    this.processTimeQueueSoon()
  }

  * processTimeQueue () {
    // Process expired cases
    yield this.caseExpiryMonitor.processExpiredCases()

    // Set the timer to the earliest date on the timeQueue
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
    this.processTimeQueueSoon()
  }

  processTimeQueueSoon () {
    const _this = this
    const earliestDate = this.timeQueue.getEarliestDate()

    // Don't reschedule the timer if nothing is waiting
    if (!earliestDate) {
      return
    }
    this.log.debug('next expiration at ' + earliestDate)

    // If we set the timeout to greater than the MAX_32INT it
    // will be triggered right away so we'll just set it to
    // the longest possible timeout and that will cause us to check again
    const timeoutDuration = Math.min(moment(earliestDate).diff(moment()), MAX_32INT)
    this.timeout = defer.setTimeout(function * () {
      yield _this.processTimeQueue()
    }, timeoutDuration)
  }

  stop () {
    const _this = this

    clearTimeout(_this.timeout)
    if (_this.listener) {
      _this.timeQueue.off('insert', _this.listener)
      _this.listener = null
    }
  }
}

module.exports = TimerWorker
