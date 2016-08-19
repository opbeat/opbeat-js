var TransactionService = require('../transaction/transaction_service')

var utils = require('../lib/utils')

if (typeof window.Zone === 'undefined') {
  require('zone.js')
}

function ServiceContainer (serviceFactory) {
  this.serviceFactory = serviceFactory
  this.services = {}
  this.services.configService = this.serviceFactory.getConfigService()
  this.services.logger = this.serviceFactory.getLogger()
  this.services.zoneService = this.createZoneService()
}

ServiceContainer.prototype.initialize = function () {
  var configService = this.services.configService
  var logger = this.services.logger
  var zoneService = this.services.zoneService

  var opbeatBackend = this.services.opbeatBackend = this.serviceFactory.getOpbeatBackend()
  var transactionService = this.services.transactionService = new TransactionService(zoneService, this.services.logger, configService, opbeatBackend)
  transactionService.scheduleTransactionSend()

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

  var ZoneService = require('../transaction/zone_service')
  return new ZoneService(window.Zone.current, logger, this.services.configService)
}

module.exports = ServiceContainer
