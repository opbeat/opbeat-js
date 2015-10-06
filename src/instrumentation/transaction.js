'use strict'

var Trace = require('./trace')

var Transaction = function (queue, name, type) {
  this.metadata = {}
  this.name = name
  this.type = type
  this.ended = false

  this.traces = []
  this.activetraces = []
  this._queue = queue

  console.log('opbeat.instrumentation.transaction.ctor', this.name)

  // A transaction should always have a root trace spanning the entire
  // transaction.
  this._rootTrace = this.startTrace('transaction', 'transaction')

  this._startStamp = this._rootTrace._startStamp
  this.duration = this._rootTrace.duration.bind(this._rootTrace)
}

Transaction.prototype.end = function () {
  this.ended = true

  this._rootTrace.end()
  this._queue.add(this)

  console.log('opbeat.instrumentation.transaction.end', this.name, this.activetraces.length)
}

Transaction.prototype.startTrace = function (signature, type) {
  console.log('opbeat.instrumentation.transaction.startTrace', this.name)
  var trace = new Trace(this, signature, type)
  this.activetraces.push(trace)

  return trace
}

Transaction.prototype._onTraceEnd = function (trace) {
  this.traces.push(trace)

  var index = this.activetraces.indexOf(trace)
  if (index > -1) {
    this.activetraces.splice(index, 1)
  }

  console.log('opbeat.instrumentation.transaction._endTrace', this.name, this.activetraces.length)

}

module.exports = Transaction
