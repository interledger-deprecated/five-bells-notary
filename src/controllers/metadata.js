'use strict'
const config = require('../lib/config')

/**
 * @api {get} / Get the server metadata
 * @apiName GetMetadata
 * @apiGroup Metadata
 * @apiVersion 1.0.0
 *
 * @apiDescription This endpoint will return server metadata.
 *
 * @returns {void}
 */
exports.getResource = function * () {
  const base = config.getIn(['server', 'base_uri'])

  this.body = {
    urls: {
      health: base + '/health',
      case: base + '/cases/:id',
      case_fulfillment: base + '/cases/:id/fulfillment'
    }
  }
}
