var Transaction = require('./transaction')
var Notifier = require('./notifier')
var patchUtils = require('../patchUtils')

function TransactionService (zone, logger, options) {
  this.currentTransaction = null
  this._queue = []
  this._logger = logger

  var zoneConfig = {
    log: function log (methodName, theRest) {
      var logText = 'Zone(' + this.$id + ') ' + methodName
      var logArray = [logText, this.timeoutList.count()]
      if (typeof theRest !== 'undefined') {
        logArray.push(theRest)
      }
      logger.debug.apply(logger, logArray)
    },
    onZoneCreated: function () {
      this.log('onZoneCreated')
    },
    beforeTask: function () {
      var sig = this.signature
      this.log('beforeTask', (typeof sig === 'undefined' ? undefined : ' signature: ' + sig))
    },
    afterTask: function () {
      var sig = this.signature
      this.log('afterTask', (typeof sig === 'undefined' ? undefined : ' signature: ' + sig))
    },
    '-onError': function () {
      console.log('onError')
    },
    enqueueTask: function () {
      this.log('enqueueTask', arguments)
    },
    dequeueTask: function () {
      console.log('dequeueTask')
    },
    $setTimeout: function (parentTimeout) {
      return function (timeoutFn, delay) {
        var self = this
        if (delay === 0) {
          var args = patchUtils.argumentsToArray(arguments)
          var tId
          args[0] = patchUtils.wrapAfter(timeoutFn, function () {
            self.timeoutList.remove(tId)
            self.log(' - setTimeout ', ' delay: ' + delay)
          })
          tId = parentTimeout.apply(this, args)
          self.timeoutList.set(tId, false)
          self.log(' + setTimeout ', ' delay: ' + delay)
          return tId
        } else {
          return parentTimeout.apply(this, arguments)
        }
      }
    },
    '-clearTimeout': function (id) {
      this.timeoutList.remove(id)
      this.log('clearTimeout', this.timeout)
    },
    '-setInterval': function () {
      console.log('setInterval')
    },
    '-requestAnimationFrame': function () {
      this.log('requestAnimationFrame')
    },
    '-webkitRequestAnimationFrame': function () {
      console.log('webkitRequestAnimationFrame')
    },
    '-mozRequestAnimationFrame': function () {
      console.log('mozRequestAnimationFrame')
    }
  }
  this.zone = zone.fork(zoneConfig)
  this.zone.timeoutList = new Notifier()
  this._queue = []
}

TransactionService.prototype.getCurrentTransaction = function () {}
TransactionService.prototype.routeChangeStarted = function (routeName) {}

TransactionService.prototype.startTransaction = function (name, type, options) {
  var tr = new Transaction(name, type, options)
  this.currentTransaction = tr
  var self = this
  self.zone.log('TransactionService.startTransaction', tr)
  self.zone.timeoutList.notify = function () {
    var notifier = this
    if (notifier.count() === 0) {
      self.zone.parent.setTimeoutUnpatched(function () {
        if (notifier.count() === 0) {
          tr.end()
          self.zone.log('TransactionService transaction ended', tr)
        }
      }, 0)
    }
  }

  tr.donePromise.then(function (t) {
    self.zone.log('TransactionService transaction finished', tr)
    self.add(tr)
  })

  return tr
}

TransactionService.prototype.startTrace = function (signature, type) {
  if (this.currentTransaction !== null) {
    return this.currentTransaction.startTrace(signature, type)
  } else {
    this._logger.debug('TransactionService.startTrace - can not start trace, currentTransaction is null')
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
module.exports = TransactionService
