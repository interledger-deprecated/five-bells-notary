'use strict'

const metadata = {
  urls: {
    health: '/health',
    case: '/cases/:id',
    case_fulfillment: '/cases/:id/fulfillment'
  }
}

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
exports.getResource = function * () { this.body = metadata }
