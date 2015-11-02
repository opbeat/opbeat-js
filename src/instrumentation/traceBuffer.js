var logger = require('../lib/logger')
var Trace = require('./trace')

var TraceBuffer = function (name) {
  this.traces = []
  this.activetraces = []
  this.traceTransactionRef = this
  this._setTraceParent = false
}

TraceBuffer.prototype.startTrace = function (signature, type) {
  var trace = new Trace(this.traceTransactionRef, signature, type)

  if (this._setTraceParent) {
    trace.setParent(this.traceTransactionRef._rootTrace)
  }

  this.activetraces.push(trace)

  logger.log('opbeat.instrumentation.traceHolder.startTrace', signature)

  return trace
}

TraceBuffer.prototype._onTraceEnd = function (trace) {
  this.traces.push(trace)

  var index = this.activetraces.indexOf(trace)
  if (index > -1) {
    this.activetraces.splice(index, 1)
  }

  logger.log('opbeat.instrumentation.traceHolder._endTrace', this.name, trace.signature)
}

TraceBuffer.prototype.setTransactionRef = function (transaction) {
  this.traceTransactionRef = transaction
  this._setTraceParent = true

  this.activetraces.forEach(function (trace) {
    trace.transaction = this.traceTransactionRef
  }.bind(this))

  this.traces.forEach(function (trace) {
    trace.transaction = this.traceTransactionRef
  }.bind(this))
}

TraceBuffer.prototype.getTraces = function () {
  return this.traces
}

TraceBuffer.prototype.getActiveTraces = function () {
  return this.activetraces
}

module.exports = TraceBuffer
