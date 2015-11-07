var Promise = require('bluebird')
var logger = require('../lib/logger')
var frames = require('../exceptions/frames')
var traceCache = require('./traceCache')

var Trace = module.exports = function (transaction, signature, type) {
  this.transaction = transaction
  this.signature = signature
  this.type = type
  this.ended = false
  this._parent = null

  // Start timers
  this._start = window.performance.now()
  this._startStamp = new Date()

  this._isFinish = new Promise(function (resolve, reject) {
    this._endTraceFunc = resolve
  }.bind(this))

  this.getTraceStackFrames(function (frames) {
    if (frames) {
      this.frames = frames
    }

    this._endTraceFunc() // Mark the trace as finished
  }.bind(this))

  logger.log('%c -- opbeat.instrumentation.trace.start', 'color: #9a6bcb', this.signature, this._start)
}

Trace.prototype.end = function () {
  this._diff = window.performance.now() - this._start
  this.ended = true

  logger.log('%c -- opbeat.instrumentation.trace.end', 'color: #9a6bcb', this.signature, this._diff)

  this._isFinish.then(function() {
    this.transaction._onTraceEnd(this)
  }.bind(this))
}

Trace.prototype.duration = function () {
  if (!this.ended) {
    console.error('Trying to call trace.duration() on un-ended Trace!')
    return null
  }

  return parseFloat(this._diff)
}

Trace.prototype.startTime = function () {
  if (!this.ended || !this.transaction.ended) {
    logger.error('Trying to call trace.startTime() for un-ended Trace/Transaction!')
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

Trace.prototype.getTraceFingerprint = function () {
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
  var key = this.getTraceFingerprint()
  var traceFrames = traceCache.get(key)
  if (traceFrames) {
    callback(traceFrames)
  } else {
    frames.getFramesForCurrent().then(function (traceFrames) {
      traceCache.set(key, traceFrames)
      callback(traceFrames)
    }).caught(function () {
      callback(null)
    })
  }
}

module.exports = Trace
