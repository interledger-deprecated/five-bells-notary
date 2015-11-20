'use strict'

const Config = require('five-bells-shared').Config

module.exports = class NotaryConfig extends Config {
  constructor () {
    super('notary')
    this.parseServerConfig()
    this.parseDatabaseConfig()

    if (process.env.NODE_ENV === 'unit') {
      this.server.public_host = 'localhost'
      this.server.port = 61337
      this.server.public_port = 80
      this.db.uri = 'sqlite://'
      this.updateDerivativeServerConfig()
    }
  }
}
