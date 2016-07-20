var backendUtils = require('./backend_utils')
module.exports = OpbeatBackend
function OpbeatBackend (transport, logger, config) {
  this._logger = logger
  this._transport = transport
  this._config = config
}
OpbeatBackend.prototype.sendError = function (errorData) {
  if (this._config.isValid()) {
    errorData.stacktrace.frames = backendUtils.createValidFrames(errorData.stacktrace.frames)
    this._transport.sendError(errorData)
  } else {
    this._logger.debug('Config is not valid')
  }
}

OpbeatBackend.prototype.groupSmallContinuouslySimilarTraces = function (transaction, threshold) {
  var transDuration = transaction.duration()
  var traces = []
  var lastCount = 1
  transaction.traces
    .forEach(function (trace, index) {
      if (traces.length === 0) {
        traces.push(trace)
      } else {
        var lastTrace = traces[traces.length - 1]

        var isContinuouslySimilar = lastTrace.type === trace.type &&
          lastTrace.signature === trace.signature &&
          trace.duration() / transDuration < threshold &&
          (trace._start - lastTrace._end) / transDuration < threshold

        var isLastTrace = transaction.traces.length === index + 1

        if (isContinuouslySimilar) {
          lastCount++
          lastTrace._end = trace._end
          lastTrace.calcDiff()
        }

        if (lastCount > 1 && (!isContinuouslySimilar || isLastTrace)) {
          lastTrace.signature = lastCount + 'x ' + lastTrace.signature
          lastCount = 1
        }

        if (!isContinuouslySimilar && !isLastTrace) {
          traces.push(trace)
        }
      }
    })
  return traces
}

OpbeatBackend.prototype.checkBrowserResponsiveness = function (transaction, interval, buffer) {
  var counter = transaction.browserResponsivenessCounter
  if (typeof interval === 'undefined' || typeof counter === 'undefined') {
    return true
  }

  var duration = transaction._rootTrace.duration()
  var expectedCount = Math.floor(duration / interval)
  var wasBrowserResponsive = counter + buffer >= expectedCount

  return wasBrowserResponsive
}

OpbeatBackend.prototype.sendTransactions = function (transactionList) {
  var opbeatBackend = this
  if (this._config.isValid()) {
    transactionList.forEach(function (transaction) {
      transaction.traces.sort(function (traceA, traceB) {
        return traceA._start - traceB._start
      })

      if (opbeatBackend._config.get('performance.groupSimilarTraces')) {
        var similarTraceThreshold = opbeatBackend._config.get('performance.similarTraceThreshold')
        transaction.traces = opbeatBackend.groupSmallContinuouslySimilarTraces(transaction, similarTraceThreshold)
      }
    })
    var filterTransactions = transactionList.filter(function (tr) {
      var checkBrowserResponsiveness = opbeatBackend._config.get('performance.checkBrowserResponsiveness')

      if (checkBrowserResponsiveness) {
        var interval = opbeatBackend._config.get('performance.browserResponsivenessInterval')
        var buffer = opbeatBackend._config.get('performance.browserResponsivenessBuffer')

        var duration = tr._rootTrace.duration()
        var wasBrowserResponsive = opbeatBackend.checkBrowserResponsiveness(tr, interval, buffer)
        if (!wasBrowserResponsive) {
          opbeatBackend._logger.debug('Transaction was discarded! browser was not responsive enough during the transaction.', ' duration:', duration, ' browserResponsivenessCounter:', tr.browserResponsivenessCounter, 'interval:', interval)
          return false
        }
      }
      return true
    })

    if (filterTransactions.length > 0) {
      var formatedTransactions = this._formatTransactions(filterTransactions)
      return this._transport.sendTransaction(formatedTransactions)
    }
  } else {
    this._logger.debug('Config is not valid')
  }
}

OpbeatBackend.prototype._formatTransactions = function (transactionList) {
  var transactions = this.groupTransactions(transactionList)

  var traces = [].concat.apply([], transactionList.map(function (trans) {
    return trans.traces
  }))

  var groupedTraces = groupTraces(traces)
  var groupedTracesTimings = this.getRawGroupedTracesTimings(traces, groupedTraces)

  return {
    transactions: transactions,
    traces: {
      groups: groupedTraces,
      raw: groupedTracesTimings
    }
  }
}

OpbeatBackend.prototype.groupTransactions = function groupTransactions (transactions) {
  var groups = grouper(transactions, transactionGroupingKey)
  return Object.keys(groups).map(function (key) {
    var trans = groups[key][0]
    var durations = groups[key].map(function (trans) {
      return trans.duration()
    })
    return {
      transaction: trans.name,
      result: trans.result,
      kind: trans.type,
      timestamp: groupingTs(trans._startStamp).toISOString(),
      durations: durations
    }
  })
}

OpbeatBackend.prototype.getRawGroupedTracesTimings = function getRawGroupedTracesTimings (traces, groupedTraces) {
  var getTraceGroupIndex = function (col, item) {
    var index = 0
    var targetGroup = traceGroupingKey(item)

    col.forEach(function (item, i) {
      if (item._group === targetGroup) {
        index = i
      }
    })

    return index
  }
  var self = this
  var groupedByTransaction = grouper(traces, function (trace) {
    return trace.transaction.name + '|' + trace.transaction._start
  })

  return Object.keys(groupedByTransaction).map(function (key) {
    var traces = groupedByTransaction[key]
    var transaction = traces[0].transaction

    var data = [transaction.duration()]

    traces.forEach(function (trace) {
      var groupIndex = getTraceGroupIndex(groupedTraces, trace)
      var relativeTraceStart = trace._start - transaction._start

      if (relativeTraceStart > transaction.duration()) {
        self._logger.debug('%c -- opbeat.instrumentation.getRawGroupedTracesTimings.error.relativeTraceStartLargerThanTransactionDuration', 'color: #ff0000', relativeTraceStart, transaction._start, transaction.duration(), { trace: trace, transaction: transaction })
      } else if (relativeTraceStart < 0) {
        self._logger.debug('%c -- opbeat.instrumentation.getRawGroupedTracesTimings.error.negativeRelativeTraceStart!', 'color: #ff0000', relativeTraceStart, trace._start, transaction._start, trace)
      } else if (trace.duration() > transaction.duration()) {
        self._logger.debug('%c -- opbeat.instrumentation.getRawGroupedTracesTimings.error.traceDurationLargerThanTranscationDuration', 'color: #ff0000', trace.duration(), transaction.duration(), { trace: trace, transaction: transaction })
      } else {
        data.push([groupIndex, relativeTraceStart, trace.duration()])
      }
    })

    return data
  })
}

function groupTraces (traces) {
  var groupedByMinute = grouper(traces, traceGroupingKey)

  return Object.keys(groupedByMinute).map(function (key) {
    var trace = groupedByMinute[key][0]

    var startTime = trace._start
    if (trace.transaction) {
      startTime = startTime - trace.transaction._start
    } else {
      startTime = 0
    }

    var extra = {}
    var frames = backendUtils.createValidFrames(trace.frames)
    if (frames.length > 0) {
      extra._frames = frames
    }

    return {
      transaction: trace.transaction.name,
      signature: trace.signature,
      kind: trace.type,
      timestamp: trace.transaction._startStamp.toISOString(),
      parents: trace.ancestors(),
      extra: extra,
      _group: key
    }
  }).sort(function (a, b) {
    return a.start_time - b.start_time
  })
}

function grouper (arr, func) {
  var groups = {}

  arr.forEach(function (obj) {
    var key = func(obj)
    if (key in groups) {
      groups[key].push(obj)
    } else {
      groups[key] = [obj]
    }

    obj._traceGroup = key
  })

  return groups
}

function groupingTs (ts) {
  return new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), ts.getHours(), ts.getMinutes())
}

function transactionGroupingKey (trans) {
  return [
    groupingTs(trans._startStamp).getTime(),
    trans.name,
    trans.result,
    trans.type
  ].join('-')
}

function traceGroupingKey (trace) {
  var ancestors = trace.ancestors().map(function (trace) {
    return trace.signature
  }).join(',')

  return [
    groupingTs(trace.transaction._startStamp).getTime(),
    trace.transaction.name,
    ancestors,
    trace.signature,
    trace.type
  ].join('-')
}
