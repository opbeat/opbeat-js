var logger = require('../lib/logger')

var TransactionStore = function () {

}

TransactionStore.prototype.init = function($injector) {
  this.$rootScope = $injector.get('$rootScope')
  this.$rootScope._opbeatTransactionStore = {}
}

TransactionStore.prototype.pushToUrl = function (url, transaction) {
  var transactions = this.$rootScope._opbeatTransactionStore[url] || [];
  transactions.push(transaction)

  logger.log('opbeat.instrumentation.TransactionStore.pushToUrl', url, transaction)

  this.$rootScope._opbeatTransactionStore[url] = transactions
}

TransactionStore.prototype.getAllByUrl = function (url) {
  logger.log('opbeat.instrumentation.TransactionStore.pushToUrl', url, this.$rootScope)

  if (!this.$rootScope) {
    return []
  }

  return this.$rootScope._opbeatTransactionStore[url] || []
}

TransactionStore.prototype.getRecentByUrl = function (url) {
  var transactions

  if (this.$rootScope) {
    transactions  = this.$rootScope._opbeatTransactionStore[url];
  }

  logger.log('opbeat.instrumentation.TransactionStore.getRecentByUrl', url, transactions)

  if (transactions && transactions.length) {
    return transactions.slice(-1)[0]
  }

  return null
}

TransactionStore.prototype.clearByUrl = function (url) {
  this.$rootScope._opbeatTransactionStore[url] = []
}

module.exports = new TransactionStore()
