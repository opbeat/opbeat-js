var Transaction = require('./transaction')
var utils = require('../lib/utils')
var Subscription = require('../common/subscription')

function TransactionService (zoneService, logger, config) {
  this._config = config
  if (typeof config === 'undefined') {
    logger.debug('TransactionService: config is not provided')
  }
  this._queue = []
  this._logger = logger
  this._zoneService = zoneService

  this.transactions = {}
  this.nextId = 1

  this.taskMap = {}

  this._queue = []

  this._subscription = new Subscription()
}

TransactionService.prototype.getTransaction = function (id) {
  return this.transactions[id]
}

TransactionService.prototype.createTransaction = function (name, type) {}

TransactionService.prototype.startTransaction = function (name, type) {
  var self = this
  var tr = this._zoneService.get('transaction')
  if (typeof tr === 'undefined' || tr.ended) {
    tr = new Transaction(name, type, this._config.get('performance'))
    this._zoneService.set('transaction', tr)
  } else {
    tr.name = name
    tr.type = type
    tr._options = this._config.get('performance')
  }

  this._logger.debug('TransactionService.startTransaction', tr)
  var p = tr.donePromise
  p.then(function (t) {
    self._logger.debug('TransactionService transaction finished', tr)
    self.add(tr)
    self._subscription.applyAll(self, [tr])
  })
  return tr
}

TransactionService.prototype.startTrace = function (signature, type, options) {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    this._logger.debug('TransactionService.startTrace', signature, type)
  } else {
    tr = new Transaction('ZoneTransaction', 'transaction', this._config.get('performance'))
    this._zoneService.set('transaction', tr)
    this._logger.debug('TransactionService.startTrace - ZoneTransaction', signature, type)
  }
  return tr.startTrace(signature, type, options)
}

// !!DEPRECATED!!
TransactionService.prototype.isLocked = function () {
  return false
}

TransactionService.prototype.add = function (transaction) {
  this._queue.push(transaction)
  this._logger.debug('TransactionService.add', transaction)
}

TransactionService.prototype.getTransactions = function () {
  return this._queue
}

TransactionService.prototype.clearTransactions = function () {
  this._queue = []
}

TransactionService.prototype.subscribe = function (fn) {
  return this._subscription.subscribe(fn)
}

module.exports = TransactionService
