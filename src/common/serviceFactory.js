var OpbeatBackend = require('../backend/opbeat_backend')
var Logger = require('loglevel')
var Config = require('../lib/config')

var utils = require('../lib/utils')
var transport = require('../lib/transport')
var ExceptionHandler = require('../exceptions/exceptionHandler')

function ServiceFactory () {
  this.services = {}
}

ServiceFactory.prototype.getOpbeatBackend = function () {
  if (utils.isUndefined(this.services['OpbeatBackend'])) {
    var logger = this.getLogger()
    var configService = this.getConfigService()
    var _transport = this.getTransport()
    this.services['OpbeatBackend'] = new OpbeatBackend(_transport, logger, configService)
  }
  return this.services['OpbeatBackend']
}

ServiceFactory.prototype.getTransport = function () {
  if (utils.isUndefined(this.services['Transport'])) {
    this.services['Transport'] = transport
  }
  return this.services['Transport']
}

ServiceFactory.prototype.setLogLevel = function (logger, configService) {
  if (configService.get('debug') === true && configService.config.logLevel !== 'trace') {
    logger.setLevel('debug', false)
  } else {
    logger.setLevel(configService.get('logLevel'), false)
  }
}

ServiceFactory.prototype.getLogger = function () {
  if (utils.isUndefined(this.services['Logger'])) {
    var configService = this.getConfigService()
    var serviceFactory = this
    serviceFactory.setLogLevel(Logger, configService)
    configService.subscribeToChange(function (newConfig) {
      serviceFactory.setLogLevel(Logger, configService)
    })
    this.services['Logger'] = Logger
  }
  return this.services['Logger']
}

ServiceFactory.prototype.getConfigService = function () {
  if (utils.isUndefined(this.services['ConfigService'])) {
    Config.init()
    this.services['ConfigService'] = Config
  }
  return this.services['ConfigService']
}

ServiceFactory.prototype.getExceptionHandler = function () {
  if (utils.isUndefined(this.services['ExceptionHandler'])) {
    var logger = this.getLogger()
    var configService = this.getConfigService()
    var exceptionHandler = new ExceptionHandler(this.getOpbeatBackend(), configService, logger)
    this.services['ExceptionHandler'] = exceptionHandler
  }
  return this.services['ExceptionHandler']
}

module.exports = ServiceFactory
