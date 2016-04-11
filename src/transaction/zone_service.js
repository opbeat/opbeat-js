var patchUtils = require('../patchUtils')

var utils = require('../lib/utils')

module.exports = function ZoneService (zone, transactionService, logger) {
  var zoneConfig = {
    log: function log (methodName, theRest) {
      var logText = 'Zone(' + this.$id + ') ' + methodName
      var logArray = [logText]
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
    // '-onError': function () {
    //   this.log('onError')
    // },
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
    }
    // '-setInterval': function () {
    //   this.log('setInterval')
    // },
    // '-requestAnimationFrame': function () {
    //   this.log('requestAnimationFrame')
    // },
    // '-webkitRequestAnimationFrame': function () {
    //   this.log('webkitRequestAnimationFrame')
    // },
    // '-mozRequestAnimationFrame': function () {
    //   this.log('mozRequestAnimationFrame')
    // }
  }
  this.zone = zone.fork(zoneConfig)

  this.zone._addTransactionTask = function (taskId) {
    transactionService.addTask(taskId)
  }
  this.zone._removeTransactionTask = function (taskId) {
    transactionService.removeTask(taskId)
  }
}
