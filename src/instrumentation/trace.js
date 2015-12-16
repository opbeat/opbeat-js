var Promise = require('es6-promise').Promise
var logger = require('../lib/logger')
var frames = require('../exceptions/frames')
var traceCache = require('./traceCache')

var Trace = module.exports = function (transaction, signature, type, options) {
  this.transaction = transaction
  this.signature = signature
  this.type = type
  this.ended = false
  this._parent = null
  this._diff = null
  this._end = null

  // Start timers
  this._start = window.performance.now()
  this._startStamp = new Date()

  this._isFinish = new Promise(function (resolve, reject) {
    this._markFinishedFunc = resolve
  }.bind(this))

  var shouldGenerateStackFrames = options.config.get('performance.enableStackFrames')

  logger.log('%c -- opbeat.instrumentation.trace.shouldGenerateStackFrames', 'color: #9a6bcb', this.signature, shouldGenerateStackFrames)

  if (shouldGenerateStackFrames) {
    this.getTraceStackFrames(function (frames) {
      if (frames) {
        this.frames = frames.reverse() // Reverse frames to make Opbeat happy
      }
      this._markFinishedFunc() // Mark the trace as finished
    }.bind(this))
  } else {
    this._markFinishedFunc() // Mark the trace as finished
  }

  logger.log('%c -- opbeat.instrumentation.trace.start', 'color: #9a6bcb', this.signature, this._start)
}

Trace.prototype.calcDiff = function () {
  if (!this._end || !this._start) {
    return
  }
  this._diff = this._end - this._start
}

Trace.prototype.end = function () {
  this._end = window.performance.now()

  this.calcDiff()
  this.ended = true

  logger.log('%c -- opbeat.instrumentation.trace.end', 'color: #9a6bcb', this.signature, this._end, this._diff)

  this._isFinish.then(function () {
    this.transaction._onTraceEnd(this)
  }.bind(this))
}

Trace.prototype.duration = function () {
  if (!this.ended) {
    logger.log('%c -- opbeat.instrumentation.trace.duration.error.un-ended.trace!', 'color: #ff0000', this.signature, this._diff)
    return null
  }

  return parseFloat(this._diff)
}

Trace.prototype.startTime = function () {
  if (!this.ended || !this.transaction.ended) {
    logger.log('%c -- opbeat.instrumentation.trace.startTime.error.un-ended.trace!', 'color: #ff0000', this.signature, this._diff)
    return null
  }

  return this._start
}

Trace.prototype.ancestors = function () {
  var parent = this.parent()
  if (!parent) {
    return []
  } else {
    return [parent.signature]
  }
}

Trace.prototype.parent = function () {
  return this._parent
}

Trace.prototype.setParent = function (val) {
  this._parent = val
}

Trace.prototype.getFingerprint = function () {
  var key = [this.transaction.name, this.signature, this.type]

  // Iterate over parents
  var prev = this._parent
  while (prev) {
    key.push(prev.signature)
    prev = prev._parent
  }

  return key.join('-')
}

Trace.prototype.getTraceStackFrames = function (callback) {
  // Use callbacks instead of Promises to keep the stack
  var key = this.getFingerprint()
  var traceFrames = traceCache.get(key)
  if (traceFrames) {
    callback(traceFrames)
  } else {
    frames.getFramesForCurrent().then(function (traceFrames) {
      traceCache.set(key, traceFrames)
      callback(traceFrames)
    })['catch'](function () {
      callback(null)
    })
  }
}

module.exports = Trace
