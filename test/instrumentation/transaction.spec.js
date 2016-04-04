var Config = require('../../src/lib/config')
var Transaction = require('../../src/instrumentation/transaction')
var Trace = require('../../src/instrumentation/trace')

var InstrumentationMock = function () {
  this._queue = []
}

InstrumentationMock.prototype.add = function (transaction) {
  this._queue.push(transaction)
}

InstrumentationMock.prototype.startTransaction = function (name, type, options) {
  return new Transaction(this, name, type, options)
}

xdescribe('instrumentation.transaction', function () {
  var instrumentationMock
  var config = Config
  config.init()
  beforeEach(function () {
    instrumentationMock = new InstrumentationMock()
  })

  xit('should contain correct number of traces in the end', function (done) {
    var firstTrace = new Trace(this, 'first-trace-signature', 'first-trace', { config: config })
    firstTrace.end()

    var transaction = instrumentationMock.startTransaction('/', 'transaction', { config: config })
    transaction.end()

    firstTrace.transaction = transaction
    firstTrace.setParent(transaction._rootTrace)
    transaction.addEndedTraces([firstTrace])

    var lastTrace = transaction.startTrace('last-trace-signature', 'last-trace')
    lastTrace.end()

    setTimeout(function () {
      expect(transaction.traces.length).toBe(3)
      done()
    }, 100)
  })

  it('should adjust rootTrace to earliest trace', function (done) {
    var firstTrace = new Trace(this, 'first-trace-signature', 'first-trace', { config: config })
    firstTrace.end()

    var transaction = instrumentationMock.startTransaction('/', 'transaction', { config: config })
    transaction.end()

    firstTrace.transaction = transaction
    firstTrace.setParent(transaction._rootTrace)
    transaction.addEndedTraces([firstTrace])

    var lastTrace = transaction.startTrace('last-trace-signature', 'last-trace')
    lastTrace.end()

    setTimeout(function () {
      expect(transaction._rootTrace._start).toBe(firstTrace._start)
      expect(transaction._rootTrace._end).toBe(lastTrace._end)
      expect(transaction._rootTrace._diff).toBe(lastTrace._end - firstTrace._start)
      done()
    }, 100) // todo fix race condition
  })

  it('should adjust rootTrace to latest trace', function (done) {
    var transaction = instrumentationMock.startTransaction('/', 'transaction', { config: config })
    var rootTraceStart = transaction._rootTrace._start

    var firstTrace = transaction.startTrace('first-trace-signature', 'first-trace')
    firstTrace.end()

    var longTrace = transaction.startTrace('long-trace-signature', 'long-trace')

    var lastTrace = transaction.startTrace('last-trace-signature', 'last-trace')
    lastTrace.end()

    transaction.end()

    setTimeout(function () {
      longTrace.end()

      setTimeout(function () {
        expect(transaction._rootTrace._start).toBe(rootTraceStart)
        expect(transaction._rootTrace._end).toBe(longTrace._end)
        expect(transaction._rootTrace._diff).toBe(longTrace._end - rootTraceStart)
        done()
      })
    }, 500)
  })

  xit('should not start any traces after transaction has been added to queue', function (done) {
    var transaction = instrumentationMock.startTransaction('/', 'transaction', { config: config })
    transaction.end()
    var firstTrace = transaction.startTrace('first-trace-signature', 'first-trace')
    firstTrace.end()
    setTimeout(function () {
      // todo: transaction has already been added to the queue, shouldn't accept more traces

      var lastTrace = transaction.startTrace('last-trace-signature', 'last-trace')
      fail('done transaction should not accept more traces, now we simply ignore the newly stared trace.')
      lastTrace.end()
    })
  })
})
