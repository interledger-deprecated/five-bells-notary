'use strict'

const url = require('url')

const config = exports

config.server = {}
config.server.secure = !!process.env.PUBLIC_HTTPS
config.server.bind_ip = process.env.BIND_IP || '0.0.0.0'
config.server.port = process.env.PORT || 3000
config.server.public_host = process.env.HOSTNAME || require('os').hostname()
config.server.public_port = process.env.PUBLIC_PORT || config.server.port

// Calculate base_uri
const isCustomPort = config.server.secure
  ? +config.server.public_port !== 443
  : +config.server.public_port !== 80
config.server.base_host = config.server.public_host +
  (isCustomPort ? ':' + config.server.public_port : '')
config.server.base_uri = url.format({
  protocol: 'http' + (config.server.secure ? 's' : ''),
  host: config.server.base_host
})
