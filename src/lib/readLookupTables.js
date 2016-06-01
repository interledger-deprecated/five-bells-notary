'use strict'

const readCaseStatusCodes = require('../models/db/caseStatus').readStatusCodes
const readNotificationStatusCodes = require('../models/db/notificationStatus').readStatusCodes

function readLookupTables () {
  return Promise.all([readCaseStatusCodes(), readNotificationStatusCodes()])
}

module.exports = {
  readLookupTables
}
