var Transaction = require('./transaction')
var Notifier = require('./notifier')
var patchUtils = require('../patchUtils')

var utils = require('../lib/utils')

function TransactionService (zone, logger, options) {
  this._queue = []
  this._logger = logger

  this.transactions = {}
  this.nextId = 1

  this.currentTransactionId = null

  this.taskMap = {}

  var zoneConfig = {
    log: function log (methodName, theRest) {
      var logText = 'Zone(' + this.$id + ') ' + methodName
      var logArray = [logText, this.timeoutList.count()]
      if (!utils.isUndefined(theRest)) {
        logArray.push(theRest)
      }
      logger.debug.apply(logger, logArray)
    },
    // onZoneCreated: function () {
    //   this.log('onZoneCreated')
    // },
    // beforeTask: function () {
    //   var sig = this.signature
    //   this.log('beforeTask', (typeof sig === 'undefined' ? undefined : ' signature: ' + sig))
    // },
    // afterTask: function () {
    //   var sig = this.signature
    //   this.log('afterTask', (typeof sig === 'undefined' ? undefined : ' signature: ' + sig))
    // },
    '-onError': function () {
      this.log('onError')
    },
    // enqueueTask: function () {
    //   this.log('enqueueTask', arguments)
    // },
    // dequeueTask: function () {
    //   this.log('dequeueTask', arguments)
    // },
    $setTimeout: function (parentTimeout) {
      return function (timeoutFn, delay) {
        var self = this
        if (delay === 0) {
          var args = patchUtils.argumentsToArray(arguments)
          var tId
          args[0] = patchUtils.wrapAfter(timeoutFn, function () {
            self._removeTransactionTask(tId)
            self.log(' - setTimeout ', ' delay: ' + delay)
          })
          tId = parentTimeout.apply(this, args)
          self._addTransactionTask(tId)
          self.log(' + setTimeout ', ' delay: ' + delay)
          return tId
        } else {
          return parentTimeout.apply(this, arguments)
        }
      }
    },
    '-clearTimeout': function (id) {
      this._removeTransactionTask(id)
      this.log('clearTimeout', this.timeout)
    },
    '-setInterval': function () {
      this.log('setInterval')
    },
    '-requestAnimationFrame': function () {
      this.log('requestAnimationFrame')
    },
    '-webkitRequestAnimationFrame': function () {
      this.log('webkitRequestAnimationFrame')
    },
    '-mozRequestAnimationFrame': function () {
      this.log('mozRequestAnimationFrame')
    }
  }
  this.zone = zone.fork(zoneConfig)
  var trService = this
  this.zone.timeoutList = new Notifier()
  this.zone._addTransactionTask = function (taskId) {
    trService.taskMap[taskId] = trService.currentTransactionId
    var tr = trService.transactions[trService.currentTransactionId]
    if (!utils.isUndefined(tr)) {
      tr.addTask(taskId)
    }
  }
  this.zone._removeTransactionTask = function (taskId) {
    var trId = trService.taskMap[taskId]
    var tr = trService.transactions[trId]
    if (!utils.isUndefined(tr)) {
      tr.removeTask(taskId)
    }
    delete trService.taskMap[taskId]
  }
  this._queue = []
}

TransactionService.prototype.getCurrentTransaction = function () {}
TransactionService.prototype.routeChangeStarted = function (routeName) {}

TransactionService.prototype.startTransaction = function (name, type, options) {
  var self = this
  if (this.currentTransactionId != null) {
    this.endCurrentTransaction()
  }
  self.zone.log('TransactionService.startTransaction', tr)

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
  var trId = self.currentTransactionId
  p.then(function (t) {
    self.zone.log('TransactionService transaction finished', tr)
    self.add(tr)
    if (trId === self.currentTransactionId) {
      self.currentTransactionId = null
    }
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
module.exports = TransactionService
