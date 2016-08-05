var ngOpbeat = require('./ngOpbeat')
var TransactionService = require('../transaction/transaction_service')

var utils = require('../lib/utils')

var PatchingService = require('../patching/patchingService')

function ServiceContainer (serviceFactory) {
  this.serviceFactory = serviceFactory
  this.services = {}

  this.services.configService = this.serviceFactory.getConfigService()

  this.services.logger = this.serviceFactory.getLogger()
}

ServiceContainer.prototype.init = function () {
  var configService = this.services.configService
  var logger = this.services.logger
  var angular = window.angular
  if (typeof angular === 'undefined') {
    logger.warn('AngularJS is not available. Please make sure you load opbeat-angular after AngularJS.')
  } else if (!configService.isPlatformSupport()) {
    ngOpbeat(this)
    this.services.logger.warn('Platform is not supported.')
  } else if (!this.isAngularSupported()) {
    ngOpbeat(this)
    logger.warn('AngularJS version is not supported.')
  } else {
    this.initSupportedPlatform()
  }
}

ServiceContainer.prototype.isAngularSupported = function () {
  var angular = window.angular
  return (angular.version && angular.version.major >= 1 && (angular.version.minor > 3 || angular.version.minor === 3 && angular.version.dot >= 12))
}

ServiceContainer.prototype.initSupportedPlatform = function () {
  var configService = this.services.configService
  var logger = this.services.logger

  var patchingService = new PatchingService()
  patchingService.patchAll()

  var zoneService = this.services.zoneService = this.createZoneService()

  var transactionService = this.services.transactionService = new TransactionService(zoneService, this.services.logger, configService)

  this.scheduleTransactionSend()

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

  this.services.exceptionHandler = this.serviceFactory.getExceptionHandler()
  ngOpbeat(this)
}

ServiceContainer.prototype.createZoneService = function () {
  var logger = this.services.logger

  if (typeof window.Zone === 'undefined') {
    require('zone.js')
  }

  var ZoneService = require('../transaction/zone_service')
  return new ZoneService(window.Zone.current, logger, this.services.configService)
}

ServiceContainer.prototype.scheduleTransactionSend = function () {
  var logger = this.services.logger

  var opbeatBackend = this.serviceFactory.getOpbeatBackend()
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
