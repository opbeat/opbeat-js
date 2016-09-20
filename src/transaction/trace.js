var frames = require('../exceptions/frames')
var traceCache = require('./traceCache')
var utils = require('../lib/utils')

function Trace (transaction, signature, type, options) {
  this.transaction = transaction
  this.signature = signature
  this.type = type
  this.ended = false
  this._parent = null
  this._diff = null
  this._end = null

  // Start timers
  this._start = window.performance.now()

  this._isFinish = new Promise(function (resolve, reject) {
    this._markFinishedFunc = resolve
  }.bind(this))

  if (utils.isUndefined(options) || options == null) {
    options = {}
  }
  var shouldGenerateStackFrames = options['enableStackFrames']

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
  if (!utils.isUndefined(this.transaction) && typeof this.transaction._onTraceEnd === 'function') {
    this.transaction._onTraceEnd(this)
  }
}

Trace.prototype.duration = function () {
  if (!this.ended || !this._start) {
    return null
  }
  this._diff = this._end - this._start

  return parseFloat(this._diff)
}

Trace.prototype.startTime = function () {
  if (!this.ended || !this.transaction.ended) {
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
