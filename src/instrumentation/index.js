var Transaction = require('./transaction')
var request = require('../lib/transport')
var logger = require('../lib/logger')

var Instrumentation = function () {
  this._queue = []
  this.scheduler = setInterval(this._dispatch.bind(this), 10000)
}

Instrumentation.prototype.add = function (transaction) {
  this._queue.push(transaction)
}

Instrumentation.prototype.startTransaction = function (name, type) {
  return new Transaction(this, name, type)
}

Instrumentation.prototype._flush = function () {
  this._queue = []
}

Instrumentation.prototype._dispatch = function () {
  logger.log('Instrumentation.scheduler._dispatch', this._queue.length)

  if (!this._queue.length) {
    return
  }

  var transactions = this._formatTransactions()
  var flush = this._flush.bind(this)

  request.sendTransaction(transactions).finally(flush)
}

Instrumentation.prototype._formatTransactions = function () {
  var transactions = groupTransactions(this._queue)

  var traces = [].concat.apply([], this._queue.map(function (trans) {
    return trans.traces
  }))
  
  var groupedTraces = groupTraces(traces)
  var groupedTracesTimings = getRawGroupedTracesTimings(traces, groupedTraces)

  return {
    transactions: transactions,
    traces: {
      groups: groupedTraces,
      raw: groupedTracesTimings
    }
  }
}

function groupTransactions (transactions) {
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

function getRawGroupedTracesTimings (traces, groupedTraces) {
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

  var groupedByTransaction = grouper(traces, function (trace) {
    return trace.transaction.name
  })

  return Object.keys(groupedByTransaction).map(function (key) {
    var traces = groupedByTransaction[key]
    var transaction = traces[0].transaction

    var data = [transaction.duration()]

    traces.forEach(function (trace) {
      var groupIndex = getTraceGroupIndex(groupedTraces, trace)
      data.push([groupIndex, trace._start - transaction._start, trace.duration()])
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

    return {
      transaction: trace.transaction.name,
      signature: trace.signature,
      kind: trace.type,
      timestamp: trace._startStamp.toISOString(),
      parents: trace.ancestors(),
      extra: {
        _frames: trace.frames
      },
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
    groupingTs(trace._startStamp).getTime(),
    trace.transaction.name,
    ancestors,
    trace.signature,
    trace.type
  ].join('-')
}

module.exports = Instrumentation
