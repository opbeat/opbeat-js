var patchUtils = require('../patchUtils')

var utils = require('../lib/utils')
function ZoneService (zone, logger) {
  function rafPatch (parentRaf) {
    return function (rafFn) {
      var self = this
      var args = patchUtils.argumentsToArray(arguments)
      var tId
      args[0] = patchUtils.wrapAfter(rafFn, function () {
        self._removeTransactionTask('raf' + tId)
        self.log(' - requestAnimationFrame ')
      })
      tId = parentRaf.apply(this, args)
      self._addTransactionTask('raf' + tId)
      self.log(' + requestAnimationFrame ')
      return tId
    }
  }

  function cancelRafPatch (id) {
    this._removeTransactionTask('raf' + id)
    this.log('cancelAnimationFrame')
  }

  var zoneConfig = {
    log: function log (methodName, theRest) {
      var logText = 'Zone(' + this.$id + ') parent(' + this.parent.$id + ') ' + methodName
      var logArray = [logText]
      if (!utils.isUndefined(theRest)) {
        logArray.push(theRest)
      }
      logger.debug.apply(logger, logArray)
    },
    // onZoneCreated: function () {
    //   this.log('onZoneCreated')
    // },
    beforeTask: function () {
      var sig = this.signature
      this.log('beforeTask', (typeof sig === 'undefined' ? undefined : ' signature: ' + sig))
    },
    afterTask: function () {
      var sig = this.signature
      this.log('afterTask', (typeof sig === 'undefined' ? undefined : ' signature: ' + sig))
      this._detectFinish()
    },
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
            self._removeTransactionTask('setTimeout' + tId)
            self.log(' - setTimeout ', ' delay: ' + delay)
          })
          tId = parentTimeout.apply(this, args)
          self._addTransactionTask('setTimeout' + tId)
          self.log(' + setTimeout ', ' delay: ' + delay)
          return tId
        } else {
          return parentTimeout.apply(this, arguments)
        }
      }
    },
    '-clearTimeout': function (id) {
      this._removeTransactionTask('setTimeout' + id)
      this.log('clearTimeout', this.timeout)
    },
    '$requestAnimationFrame': rafPatch,
    '-cancelAnimationFrame': cancelRafPatch,

    '$webkitRequestAnimationFrame': rafPatch,
    '-webkitCancelAnimationFrame': cancelRafPatch,

    '$mozRequestAnimationFrame': rafPatch,
    '-mozCancelAnimationFrame': cancelRafPatch
  }

  this.zone = zone.fork(zoneConfig)

  this.zone._addTransactionTask = function (taskId) {
    if (this.transaction) {
      this.transaction.addTask(taskId)
    }
  }
  this.zone._removeTransactionTask = function (taskId) {
    if (this.transaction) {
      this.transaction.removeTask(taskId)
    }
  }
  this.zone._detectFinish = function () {
    if (this.transaction) {
      this.transaction.detectFinish()
    }
  }
}

ZoneService.prototype.set = function (key, value) {
  window.zone[key] = value
}
ZoneService.prototype.get = function (key) {
  return window.zone[key]
}

module.exports = ZoneService
