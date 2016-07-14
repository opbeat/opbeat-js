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
    this.services['OpbeatBackend'] = new OpbeatBackend(transport, logger, configService)
  }
  return this.services['OpbeatBackend']
}

ServiceFactory.prototype.getLogger = function () {
  if (utils.isUndefined(this.services['Logger'])) {
    var configService = this.getConfigService()
    if (configService.get('debug') === true) {
      configService.config.logLevel = 'debug'
    }
    Logger.setLevel(configService.get('logLevel'), false)
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
    var exceptionHandler = new ExceptionHandler(this.getOpbeatBackend())
    this.services['ExceptionHandler'] = exceptionHandler
  }
  return this.services['ExceptionHandler']
}

module.exports = ServiceFactory
