var Transaction = require('./transaction')
var utils = require('../lib/utils')
var Subscription = require('../common/subscription')

function TransactionService (logger, options) {
  this._queue = []
  this._logger = logger

  this.transactions = {}
  this.nextId = 1

  this.globalTransactionId = null

  this.taskMap = {}

  this._queue = []

  this._subscription = new Subscription()
}

TransactionService.prototype.routeChangeStarted = function (routeName) {}

TransactionService.prototype.startGlobalTransaction = function (name, type, options) {
  this.globalTransactionId = this.startTransaction(name, type, options)
  return this.globalTransactionId
}

TransactionService.prototype.startTransaction = function (name, type, options) {
  var tr = new Transaction(name, type, options)
  var id = this.nextId
  this.transactions[id] = tr
  this.nextId++
  this._logger.debug('TransactionService.startTransaction', tr)
  return id
}

TransactionService.prototype.endTransaction = function (trId) {
  var self = this
  var tr = self.transactions[trId]
  if (!utils.isUndefined(tr) && !tr.ended) {
    var p = tr.end()
    p.then(function (t) {
      self._logger.debug('TransactionService transaction finished', tr)
      self.add(tr)
      self._subscription.applyAll(self, [tr])
    })
  }

  if (trId === this.globalTransactionId) {
    this.globalTransactionId = null
  }
}

TransactionService.prototype.startTrace = function (signature, type, options) {
  var tr = this.transactions[this.globalTransactionId]
  if (!utils.isUndefined(tr)) {
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

TransactionService.prototype.recordEvent = function (event) {
  var tr = this.transactions[this.globalTransactionId]
  if (!utils.isUndefined(tr)) {
    return tr.recordEvent(event)
  } else {
    this._logger.debug('TransactionService.recordEvent - can not record event, no active transaction')
  }
}

TransactionService.prototype.clearTransactions = function () {
  this._queue = []
}

TransactionService.prototype.addTask = function (taskId) {
  this.taskMap[taskId] = this.globalTransactionId
  var tr = this.transactions[this.globalTransactionId]
  if (!utils.isUndefined(tr)) {
    tr.addTask(taskId)
  }
}

TransactionService.prototype.removeTask = function (taskId) {
  var trId = this.taskMap[taskId]
  var tr = this.transactions[trId]
  if (!utils.isUndefined(tr)) {
    tr.removeTask(taskId)
  }
  delete this.taskMap[taskId]
}

TransactionService.prototype.subscribe = function (fn) {
  return this._subscription.subscribe(fn)
}

module.exports = TransactionService
