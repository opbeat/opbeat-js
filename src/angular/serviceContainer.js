var ngOpbeat = require('./ngOpbeat')
var TransactionService = require('../transaction/transaction_service')

var utils = require('../lib/utils')

var PatchingService = require('../patching/patchingService')
var ServiceFactory = require('../common/serviceFactory')

function ServiceContainer () {
  this.serviceFactory = new ServiceFactory()
  this.services = {}

  var configService = this.services.configService = this.serviceFactory.getConfigService()

  var logger = this.services.logger = this.serviceFactory.getLogger()
  var patchingService = new PatchingService()
  patchingService.patchAll()

  var zoneService = this.services.zoneService = this.createZoneService()

  var transactionService = this.services.transactionService = new TransactionService(zoneService, this.services.logger, configService)

  if (!configService.isPlatformSupport()) {
    ngOpbeat(transactionService, this.services.logger, configService, zoneService)
    this.services.logger.debug('Platform is not supported.')
    return
  }

  this.scheduleTransactionSend()

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
