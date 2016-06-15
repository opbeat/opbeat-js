var Logger = require('loglevel')
var ngOpbeat = require('./ngOpbeat')
var TransactionService = require('../transaction/transaction_service')
var Config = require('../lib/config')

var OpbeatBackend = require('../backend/opbeat_backend')
var transport = require('../lib/transport')

var utils = require('../lib/utils')

function ServiceContainer () {
  this.services = {}

  Config.init()
  var configService = Config
  this.services.configService = configService

  var logger = this.services.logger = this.createLogger()

  var zoneService = this.services.zoneService = this.createZoneService()

  var transactionService = this.services.transactionService = new TransactionService(zoneService, this.services.logger, configService)

  if (!configService.isPlatformSupport()) {
    ngOpbeat(transactionService, this.services.logger, configService, zoneService)
    this.services.logger.debug('Platform is not supported.')
    return
  }

  this.createOpbeatBackend()

  if (typeof window.angular === 'undefined') {
    throw new Error('AngularJS is not available. Please make sure you load opbeat-angular after AngularJS.')
  }

  if (utils.isUndefined(window.opbeatApi)) {
    window.opbeatApi = {}
  }
  window.opbeatApi.subscribeToTransactions = transactionService.subscribe.bind(transactionService)

  if (!utils.isUndefined(window.opbeatApi.onload)) {
    var onOpbeatLoaded = window.opbeatApi.onload
    onOpbeatLoaded.forEach(function (fn) {
      try {
        fn()
      } catch (error) {
        logger.error(error)
      }
    })
  }

  // binding bootstrap to zone

  // window.angular.bootstrap = zoneService.zone.bind(window.angular.bootstrap)
  var _resumeDeferred = window.angular.resumeDeferredBootstrap
  window.name = 'NG_DEFER_BOOTSTRAP!' + window.name
  window.angular.resumeDeferredBootstrap = zoneService.zone.bind(function () {
    var resumeBootstrap = window.angular.resumeBootstrap
    if (typeof _resumeDeferred === 'function') {
      resumeBootstrap = _resumeDeferred
    }
    resumeBootstrap()
  })

  ngOpbeat(transactionService, logger, configService, zoneService)
}

ServiceContainer.prototype.createLogger = function () {
  if (this.services.configService.get('debug') === true) {
    this.services.configService.config.logLevel = 'debug'
  }
  Logger.setLevel(this.services.configService.get('logLevel'), false)
  return Logger
}

ServiceContainer.prototype.createZoneService = function () {
  var logger = this.services.logger
  // todo: remove this when updating to new version of zone.js
  function noop () { }
  var _warn = console.warn
  console.warn = noop

  if (typeof window.zone === 'undefined') {
    require('zone.js')
  }

  var zonePrototype = ('getPrototypeOf' in Object)
    ? Object.getPrototypeOf(window.zone) : window.zone.__proto__ // eslint-disable-line 

  zonePrototype.enqueueTask = noop
  zonePrototype.dequeueTask = noop
  console.warn = _warn

  var ZoneService = require('../transaction/zone_service')
  return new ZoneService(window.zone, logger)
}

ServiceContainer.prototype.createOpbeatBackend = function () {
  var logger = this.services.logger

  var opbeatBackend = new OpbeatBackend(transport, this.services.logger, this.services.configService)
  var serviceContainer = this

  setInterval(function () {
    var transactions = serviceContainer.services.transactionService.getTransactions()

    if (transactions.length === 0) {
      return
    }
    logger.debug('Sending Transactions to opbeat.', transactions.length)
    // todo: if transactions are already being sent, should check
    opbeatBackend.sendTransactions(transactions)
    serviceContainer.services.transactionService.clearTransactions()
  }, 5000)
}

module.exports = ServiceContainer
