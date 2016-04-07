var OpbeatBackend = require('../backend/opbeat_backend')
var transport = require('../lib/transport')
var ServiceContainer = require('./serviceContainer')
var opbeat = require('../opbeat')

var utils = require('../lib/utils')

function init () {
  var services = new ServiceContainer({logLevel: 'warn'}).services
  var logger = services.logger
  var transactionService = services.transactionService

  if (utils.isUndefined(window.opbeatApi)) {
    window.opbeatApi = {}
  }
  window.opbeatApi.subscribeToTransactions = transactionService.subscribe.bind(transactionService)

  var config = opbeat.config()
  var opbeatBackend = new OpbeatBackend(transport, logger, config)
  setInterval(function () {
    var transactions = services.transactionService.getTransactions()

    if (transactions.length === 0) {
      return
    }
    logger.debug('Sending Transactions to opbeat.', transactions.length)
    // todo: if transactions are already being sent, should check
    opbeatBackend.sendTransactions(transactions)
    transactionService.clearTransactions()
  }, 5000)

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
}

init()
