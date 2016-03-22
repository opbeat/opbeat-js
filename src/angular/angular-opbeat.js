var logger = require('loglevel')
var ngOpbeat = require('./ngOpbeat')
var TransactionService = require('../transaction/transaction_service')
var OpbeatBackend = require('../backend/opbeat_backend')
var transport = require('../lib/transport')

function init () {
  logger.setLevel('debug', false)
  var transactionService = new TransactionService(logger, {})

  // Ignoring zonejs for now
  // var useZoneJS = false
  // if (useZoneJS) {
  //   var ZoneService = require('../transaction/zone_service')
  //   var zoneService = new ZoneService(window.zone, transactionService, logger)
  //   window.angular.bootstrap = zoneService.zone.bind(window.angular.bootstrap)
  // }

  ngOpbeat(transactionService, logger)

  var opbeatBackend = new OpbeatBackend(transport, logger)

  setInterval(function () {
    var transactions = transactionService.getTransactions()

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
