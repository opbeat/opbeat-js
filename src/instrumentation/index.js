var Transaction = require('./transaction')
var request = require('../lib/transport')

var Instrumentation = function (client) {
  this._client = client
  this._queue = []
}

Instrumentation.prototype.add = function (transaction) {
  this._queue.push(transaction)
  this._send()
}

Instrumentation.prototype.startTransaction = function (name, type) {
  return new Transaction(this, name, type)
}

Instrumentation.prototype._send = function () {
  var formattedTransactions = this._formatTransactions()

  request.sendTransaction(formattedTransactions)
    .then(this._flush.bind(this))
}

Instrumentation.prototype._flush = function () {
  this._queue = []
}

Instrumentation.prototype._formatTransactions = function () {
  var transactions = groupTransactions(this._queue)

  var groupedTraces = groupTraces([].concat.apply([], this._queue.map(function (trans) {
    return trans.traces
  })))

  return {
    transactions: transactions,
    traces: {
      groups: groupedTraces.groups,
      raw: groupedTraces.raw
    }
  }
}

function groupTransactions (transactions) {
  var groups = groupByMinute(transactions, transactionGroupingKey)

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

function groupTraces (traces) {
  var groupedByMinute = groupByMinute(traces, traceGroupingKey)


  var getGroupIndex = function (key) {

    Object.keys(groupedByMinute).map(function (k, i) {
      if(k === key) {
        return i
      }
    })

    return 0;

  }

  var raw = Object.keys(groupedByMinute).map(function (key) {
    var trace = groupedByMinute[key][0]
    var transaction = trace.transaction

    var data = [transaction.duration()]

    groupedByMinute[key].map(function (trace) {
      var groupIndex = getGroupIndex(trace._traceGroup)
      data.push([groupIndex, trace._start, trace.duration()])
    })

    return data

  });

  var groups = Object.keys(groupedByMinute).map(function (key) {
    var trace = groupedByMinute[key][0]

    var startTime = trace._start
    if(trace.transaction) {
      startTime = startTime - trace.transaction._start
    } else {
      startTime = 0;
    }

    return {
      transaction: trace.transaction.name,
      signature: trace.signature,
      kind: trace.type,
      frames: [], // TODO
      timestamp: trace._startStamp.toISOString(),
      parents: trace.ancestors(),
      extra: trace.extra || {}
    }
  }).sort(function(a, b) {
    return a.start_time - b.start_time
  })

  return {
    groups: groups,
    raw: raw
  }
}

function groupByMinute (arr, grouper) {
  var groups = {}

  arr.forEach(function (obj) {
    var key = grouper(obj)
    if (key in groups){
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
  return groupingTs(trans._startStamp).getTime() + '|' + trans.name + '|' + trans.result + '|' + trans.type
}

function traceGroupingKey (trace) {
  var ancestors = trace.ancestors().map(function (trace) {
    return trace.signature
  }).join(',')

  return groupingTs(trace._startStamp).getTime() + '|' + trace.transaction.name + '|' + ancestors + '|' + trace.signature + '|' + trace.type
}

module.exports = Instrumentation
