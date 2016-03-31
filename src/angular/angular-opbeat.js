var OpbeatBackend = require('../backend/opbeat_backend')
var transport = require('../lib/transport')
var ServiceContainer = require('./serviceContainer')

function init () {
  var services = new ServiceContainer({logLevel: 'warn'}).services
  var logger = services.logger
  var transactionService = services.transactionService

  var opbeatBackend = new OpbeatBackend(transport, logger)
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
}

init()
