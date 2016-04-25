var Transaction = require('./transaction')
var utils = require('../lib/utils')
var Subscription = require('../common/subscription')

function TransactionService (zoneService, logger, options) {
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

TransactionService.prototype.startTransaction = function (name, type, options) {
  var tr = new Transaction(name, type, options)
  var id = this.nextId
  this.transactions[id] = tr
  this.nextId++
  this._logger.debug('TransactionService.startTransaction', tr)
  var self = this
  var p = tr.donePromise
  p.then(function (t) {
    self._logger.debug('TransactionService transaction finished', tr)
    self.add(tr)
    self._subscription.applyAll(self, [tr])
  })
  return id
}

TransactionService.prototype.startTrace = function (signature, type, options) {
  var tr = this._zoneService.getCurrentTransaction()
  if (!utils.isUndefined(tr) && !tr.ended) {
    this._logger.debug('TransactionService.startTrace', signature, type)
    return tr.startTrace(signature, type, options)
  } else {
    this._logger.debug('TransactionService.startTrace - can not start trace, no active transaction ', signature, type)
  }
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
