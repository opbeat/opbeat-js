var logger = require('../lib/logger')
var Trace = require('./trace')
var utils = require('../lib/utils')

var Transaction = function (queue, name, type, options) {
  this.metadata = {}
  this.name = name
  this.type = type
  this.ended = false
  this._markDoneAfterLastTrace = false
  this._isDone = false
  this._options = options
  this.uuid = utils.generateUuid()

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

Transaction.prototype.startTrace = function (signature, type) {
  var trace = new Trace(this, signature, type, this._options)
  if (this._rootTrace) {
    trace.setParent(this._rootTrace)
  }

  this._activeTraces[trace.getFingerprint()] = trace

  logger.log('- %c  opbeat.instrumentation.transaction.startTrace', 'color: #3360A3', trace.signature)

  return trace
}

Transaction.prototype.end = function () {
  if (this.ended) {
    return
  }

  this.ended = true

  logger.log('- %c opbeat.instrumentation.transaction.end', 'color: #3360A3', this.name, Object.keys(this._activeTraces).length)

  if (Object.keys(this._activeTraces).length > 0) {
    this._markDoneAfterLastTrace = true
  } else {
    this._markAsDone()
  }
}

Transaction.prototype.addEndedTraces = function (existingTraces) {
  this.traces = this.traces.concat(existingTraces)
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

    this._rootTrace.end()

    this._adjustStartToEarliestTrace()
    this._adjustDurationToLongestTrace()

    this._queue.add(this)
  }.bind(this))
}

Transaction.prototype._adjustStartToEarliestTrace = function () {
  var trace = getEarliestTrace(this.traces)

  if (trace) {
    this._rootTrace._start = trace._start
    this._rootTrace._startStamp = trace._startStamp
    this._rootTrace.calcDiff()

    this._startStamp = this._rootTrace._startStamp
    this._start = this._rootTrace._start
  }
}

Transaction.prototype._adjustDurationToLongestTrace = function () {
  var trace = getLongestTrace(this.traces)

  if (trace) {
    var currentDuration = this._rootTrace._diff
    var maxDuration = trace.duration()
    if (maxDuration > currentDuration) {
      this._rootTrace._diff = maxDuration
    }
  }
}

Transaction.prototype._onTraceEnd = function (trace) {
  this.traces.push(trace)

  logger.log('-- %c  opbeat.instrumentation.transaction.traceCount', 'color: red', this.traces.length)
  logger.log('- %c  opbeat.instrumentation.transaction._endTrace', 'color: #3360A3', trace.signature)

  // Remove trace from _activeTraces
  delete this._activeTraces[trace.getFingerprint()]

  if (this._markDoneAfterLastTrace && isActiveTraceRootTrace(this._activeTraces, this._rootTrace)) {
    this._markAsDone()
  }
}

function isActiveTraceRootTrace (activeTraces, rootTrace) {
  if (Object.keys(activeTraces).length === 1) {
    var key = Object.keys(activeTraces)[0]
    return activeTraces[key] === rootTrace
  }

  return false
}

function getLongestTrace (traces) {
  var match = null

  traces.forEach(function (trace) {
    if (!match) {
      match = trace
    }
    if (match && match.duration() < trace.duration()) {
      match = trace
    }
  })

  return match
}

function getEarliestTrace (traces) {
  var earliestTrace = null

  traces.forEach(function (trace) {
    if (!earliestTrace) {
      earliestTrace = trace
    }
    if (earliestTrace && earliestTrace._start > trace._start) {
      earliestTrace = trace
    }
  })

  return earliestTrace
}

module.exports = Transaction
