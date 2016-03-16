var Transaction = require('./transaction')
var utils = require('../lib/utils')

function TransactionService (logger, options) {
  this._queue = []
  this._logger = logger

  this.transactions = {}
  this.nextId = 1

  this.currentTransactionId = null

  this.taskMap = {}

  this._queue = []
}

TransactionService.prototype.getCurrentTransaction = function () {}
TransactionService.prototype.routeChangeStarted = function (routeName) {}

TransactionService.prototype.startTransaction = function (name, type, options) {
  var self = this
  if (this.currentTransactionId != null) {
    this.endCurrentTransaction()
  }
  self._logger.debug('TransactionService.startTransaction', tr)

  var tr = new Transaction(name, type, options)
  this.transactions[this.nextId] = tr
  this.currentTransactionId = this.nextId

  this.nextId++

  return this.currentTransactionId
}

TransactionService.prototype.endCurrentTransaction = function () {
  var self = this
  var tr = self.transactions[this.currentTransactionId]
  var p = tr.end()
  // var trId = self.currentTransactionId
  self.currentTransactionId = null
  p.then(function (t) {
    self._logger.debug('TransactionService transaction finished', tr)
    self.add(tr)
  // if (trId === self.currentTransactionId) {
  //   self.currentTransactionId = null
  // }
  })
}

TransactionService.prototype.startTrace = function (signature, type) {
  var tr = this.transactions[this.currentTransactionId]
  if (!utils.isUndefined(tr)) {
    return tr.startTrace(signature, type)
  } else {
    this._logger.debug('TransactionService.startTrace - can not start trace, no active transaction')
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
  var tr = this.transactions[this.currentTransactionId]
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
  this.taskMap[taskId] = this.currentTransactionId
  var tr = this.transactions[this.currentTransactionId]
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
module.exports = TransactionService
