var logger = require('../lib/logger')
var Trace = require('./trace')

var Transaction = function (queue, name, type) {
  this.metadata = {}
  this.name = name
  this.type = type
  this.ended = false
  this._endAfterActiveTraces = false

  this.traces = []
  this.activetraces = []
  this._queue = queue

  logger.log('- %c opbeat.instrumentation.transaction.ctor', 'color: #3360A3', this.name)

  // A transaction should always have a root trace spanning the entire transaction.
  this._rootTrace = this.startTrace('transaction', 'transaction')

  this._startStamp = this._rootTrace._startStamp
  this._start = this._rootTrace._start
  this.duration = this._rootTrace.duration.bind(this._rootTrace)
}

Transaction.prototype.end = function () {
  if (this.activetraces.length > 1) {
    this._endAfterActiveTraces = true
  } else {
    this.ended = true
    this._endAfterActiveTraces = false
    this._rootTrace.end()

    logger.log('- %c opbeat.instrumentation.transaction.end', 'color: #3360A3', this.name, this.activetraces.length)
  }

  // When all traces are finished, the transaction can be added to the queue
  var whenAllTracesFinished = this.traces.map(function (trace) {
    return trace._isFinish
  })

  Promise.all(whenAllTracesFinished).then(function () {
    logger.log('- %c opbeat.instrumentation.transaction.whenAllTracesFinished', 'color: #3360A3', this.name)
    this._queue.add(this)
  }.bind(this))
}

Transaction.prototype.startTrace = function (signature, type) {
  var trace = new Trace(this, signature, type)
  trace.setParent(this._rootTrace)

  this.activetraces.push(trace)

  return trace
}

Transaction.prototype._onTraceEnd = function (trace) {
  this.traces.push(trace)

  var index = this.activetraces.indexOf(trace)
  if (index > -1) {
    this.activetraces.splice(index, 1)
  }

  if (this._endAfterActiveTraces) {
    this.end()
  }

  logger.log('opbeat.instrumentation.transaction._endTrace', this.name, this.activetraces.length)
}

module.exports = Transaction
