var TransactionService = require('../transaction/transaction_service')

var utils = require('../lib/utils')

var PatchingService = require('../patching/patchingService')

function ServiceContainer (serviceFactory) {
  this.serviceFactory = serviceFactory
  this.services = {}

  var configService = this.services.configService = this.serviceFactory.getConfigService()

  var logger = this.services.logger = this.serviceFactory.getLogger()
  var zoneService = this.services.zoneService = this.createZoneService()

  var opbeatBackend = this.services.opbeatBackend = this.serviceFactory.getOpbeatBackend()
  var transactionService = this.services.transactionService = new TransactionService(zoneService, this.services.logger, configService, opbeatBackend)
  this.services.patchingService = new PatchingService(transactionService)

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
  this.services.exceptionHandler = this.serviceFactory.getExceptionHandler()
}

ServiceContainer.prototype.createZoneService = function () {
  var logger = this.services.logger

  if (typeof window.Zone === 'undefined') {
    require('zone.js')
  }

  var ZoneService = require('../transaction/zone_service')
  return new ZoneService(window.Zone.current, logger, this.services.configService)
}

module.exports = ServiceContainer
