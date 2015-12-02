var logger = require('../lib/logger')
var Trace = require('./trace')

var Transaction = function (queue, name, type, options) {
  this.metadata = {}
  this.name = name
  this.type = type
  this.ended = false
  this._markDoneAfterLastTrace = false
  this._isDone = false
  this._options = options

  this.traces = []
  this._activeTraces = {}
  this._queue = queue

  logger.log('- %c opbeat.instrumentation.transaction.ctor', 'color: #3360A3', this.name)

  // A transaction should always have a root trace spanning the entire transaction.
  this._rootTrace = this.startTrace('transaction', 'transaction', this._options)
  this._startStamp = this._rootTrace._startStamp
  this._start = this._rootTrace._start

  this.duration = this._rootTrace.duration.bind(this._rootTrace)
}

Transaction.prototype.end = function () {
  if (this.ended) {
    return
  }

  this.ended = true
  this._endAfterActiveTraces = false
  this._rootTrace.end()

  logger.log('- %c opbeat.instrumentation.transaction.end', 'color: #3360A3', this.name, Object.keys(this._activeTraces).length)

  if (Object.keys(this._activeTraces).length > 0) {
    this._markDoneAfterLastTrace = true
  } else {
    this._markAsDone()
  }
}

Transaction.prototype._markAsDone = function () {
  logger.log('- %c opbeat.instrumentation.transaction._markAsDone', 'color: #3360A3', this.name)

  if (this._isDone) {
    return
  }

  this._isDone = true

  // When all traces are finished, the transaction can be added to the queue
  var whenAllTracesFinished = this.traces.map(function (trace) {
    return trace._isFinish
  })

  Promise.all(whenAllTracesFinished).then(function () {
    logger.log('- %c opbeat.instrumentation.transaction.whenAllTracesFinished', 'color: #3360A3', this.name)

    this._adjustStartToEarliestTrace()

    this._queue.add(this)
  }.bind(this))
}

Transaction.prototype._adjustStartToEarliestTrace = function () {
  var trace = getEarliestTrace(this.traces)

  if(trace) {
    this._start = trace._start
    this._startStamp = trace._startStamp
  }
}

Transaction.prototype.startTrace = function (signature, type) {
  var trace = new Trace(this, signature, type, this._options)
  trace.setParent(this._rootTrace)

  this._activeTraces[trace.getFingerprint()] = trace

  logger.log('- %c  opbeat.instrumentation.transaction.startTrace', 'color: #3360A3', trace.signature)

  return trace
}

Transaction.prototype._onTraceEnd = function (trace) {
  this.traces.push(trace)

  logger.log('- %c  opbeat.instrumentation.transaction._endTrace', 'color: #3360A3', trace.signature)

  // Remove trace from _activeTraces
  delete this._activeTraces[trace.getFingerprint()]

  if (this._markDoneAfterLastTrace && Object.keys(this._activeTraces).length === 0) {
    this._markAsDone()
  }
}

function getEarliestTrace (traces) {
  var earliestTrace = null

  traces.forEach(function(trace) {
    if(!earliestTrace) {
      earliestTrace = trace
    }
    if(earliestTrace && earliestTrace._start > trace._start) {
      earliestTrace = trace
    }
  })

  return earliestTrace
}


module.exports = Transaction
