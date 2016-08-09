var ServiceContainer = require('../../src/common/serviceContainer')
var ServiceFactory = require('../../src/common/serviceFactory')
var patchAngularBootstrap = require('../../src/angular/patches/bootstrapPatch')
var ngOpbeat = require('../../src/angular/ngOpbeat')
var isAngularSupported = require('../../src/angular/isAngularSupported')
var patchCommon = require('../../src/common/patchCommon')
var Subscription = require('../../src/common/subscription')

function TransportMock (transport) {
  this._transport = transport
  this.transactions = []
  this.subscription = new Subscription()
}

TransportMock.prototype.sendTransaction = function (transactions) {
  this.transactions = this.transactions.concat(transactions)
  var trMock = this
  if (this._transport) {
    this._transport.sendTransaction(transactions).then(function () {
      trMock.subscription.applyAll(this, [transactions])
    }, function (reason) {
      console.log('Failed to send to opbeat: ', reason)
      trMock.subscription.applyAll(this, [transactions])
    })
  } else {
    this.subscription.applyAll(this, [transactions])
  }
}

TransportMock.prototype.subscribe = function (fn) {
  return this.subscription.subscribe(fn)
}

var initialized = false
function init () {
  if (initialized) {
    return
  }
  var serviceFactory = new ServiceFactory()
  var transport = serviceFactory.getTransport()
  var transportMock = new TransportMock(transport)
  serviceFactory.services['Transport'] = transportMock

  var serviceContainer = new ServiceContainer(serviceFactory)
  var services = serviceContainer.services
  // var config = serviceFactory.getConfigService()

  // opbeat.com/jahtalab/opbeat-e2e
  // config.setConfig({
  //   orgId: '7f9fa667d0a349dd8377bc740bcfc33e',
  //   appId: '6664ca4dfc'
  // })

  var logger = services.logger
  var transactionService = services.transactionService

  var opbeatBackend = serviceFactory.getOpbeatBackend()

  patchCommon(serviceContainer)
  patchAngularBootstrap(services.zoneService)

  transactionService.subscribe(function (tr) {
    opbeatBackend.sendTransactions([tr])
  })

  function getTransactions (callback, start, end) {
    if (transportMock.transactions.length >= end) {
      var trs = transportMock.transactions.slice(start, end)
      callback(trs)
      return
    }

    var cancel = transportMock.subscribe(function () {
      logger.debug('Number of transactions: ', transportMock.transactions.length)
      if (transportMock.transactions.length >= end) {
        var trs = transportMock.transactions.slice(start, end)
        callback(trs)
        cancel()
      }
    })
  }

  ngOpbeat(services.transactionService, services.logger, services.configService, isAngularSupported, services.exceptionHandler)

  window.e2e = {
    transactionService: transactionService,
    transportMock: transportMock,
    getTransactions: getTransactions
  }
  initialized = true
  return transactionService
}

module.exports = init
init()
