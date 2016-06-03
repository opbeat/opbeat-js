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

  this.patchAngularBootstrap()

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

  if (typeof window.Zone === 'undefined') {
    require('zone.js')
  }

  var ZoneService = require('../transaction/zone_service')
  return new ZoneService(window.Zone.current, logger)
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

ServiceContainer.prototype.patchAngularBootstrap = function () {
  var zoneService = this.services.zoneService

  var DEFER_LABEL = 'NG_DEFER_BOOTSTRAP!'

  var deferRegex = new RegExp('^' + DEFER_LABEL + '.*')
  // If the bootstrap is already deferred. (like run by Protractor)
  // In this case `resumeBootstrap` should be patched
  if (deferRegex.test(window.name)) {
    var originalResumeBootstrap
    Object.defineProperty(window.angular, 'resumeBootstrap', {
      get: function () {
        return function (modules) {
          return zoneService.zone.run(function () {
            originalResumeBootstrap.call(window.angular, modules)
          })
        }
      },
      set: function (resumeBootstrap) {
        originalResumeBootstrap = resumeBootstrap
      }
    })
  } else { // If this is not a test, defer bootstrapping
    window.name = DEFER_LABEL + window.name

    window.angular.resumeDeferredBootstrap = function () {
      return zoneService.zone.run(function () {
        var resumeBootstrap = window.angular.resumeBootstrap
        return resumeBootstrap.call(window.angular)
      })
    }

    /* angular should remove DEFER_LABEL from window.name, but if angular is never loaded, we want
     to remove it ourselves */
    window.addEventListener('beforeunload', function () {
      if (deferRegex.test(window.name)) {
        window.name = window.name.substring(DEFER_LABEL.length)
      }
    })
  }
}

module.exports = ServiceContainer
