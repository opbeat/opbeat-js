var logger = require('../lib/logger')
var frames = require('../exceptions/frames')

var Trace = module.exports = function (transaction, signature, type) {
  this.transaction = transaction
  this.signature = signature
  this.type = type
  this.ended = false

  this._start = performance.now()
  this._startStamp = new Date()
  this._parent = null;

  frames.getFramesForCurrent().then(function(frames) {
    this.frames = frames
  }.bind(this))

  logger.log('%c -- opbeat.instrumentation.trace.start', 'color: #9a6bcb', this.signature, this._start)
}

Trace.prototype.end = function () {
  this._diff = performance.now() - this._start
  this.ended = true

  this.transaction._onTraceEnd(this)

  logger.log('%c -- opbeat.instrumentation.trace.end', 'color: #9a6bcb', this.signature, this._diff)
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
module.exports = Trace
