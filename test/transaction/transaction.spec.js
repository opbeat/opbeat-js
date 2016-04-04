var Transaction = require('../../src/transaction/transaction')
var Trace = require('../../src/transaction/trace')

describe('transaction.Transaction', function () {
  beforeEach(function () {})

  it('should contain correct number of traces in the end', function (done) {
    var firstTrace = new Trace(this, 'first-trace-signature', 'first-trace')
    firstTrace.end()

    var transaction = new Transaction('/', 'transaction', {})

    firstTrace.transaction = transaction
    firstTrace.setParent(transaction._rootTrace)
    transaction.addEndedTraces([firstTrace])

    var lastTrace = transaction.startTrace('last-trace-signature', 'last-trace')
    lastTrace.end()
    transaction.end()

    expect(transaction.traces.length).toBe(3)
    done()
  })

  it('should adjust rootTrace to earliest trace', function (done) {
    var firstTrace = new Trace(this, 'first-trace-signature', 'first-trace')
    firstTrace.end()

    var transaction = new Transaction('/', 'transaction', {})

    firstTrace.transaction = transaction
    firstTrace.setParent(transaction._rootTrace)
    transaction.addEndedTraces([firstTrace])

    var lastTrace = transaction.startTrace('last-trace-signature', 'last-trace')

    transaction.end()

    lastTrace.end()

    expect(transaction._rootTrace._start).toBe(firstTrace._start)
    expect(transaction._rootTrace._end).toBe(lastTrace._end)
    expect(transaction._rootTrace._diff).toBe(lastTrace._end - firstTrace._start)
    done()
  })

  it('should adjust rootTrace to latest trace', function (done) {
    var transaction = new Transaction('/', 'transaction', {})
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
    var transaction = new Transaction('/', 'transaction', {})
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

  it('should generate stacktrace based on transaction options', function (done) {
    var tr = new Transaction('/', 'transaction', {'performance.enableStackFrames': true})

    var firstTrace = tr.startTrace('first-trace-signature', 'first-trace')
    firstTrace.end()

    var secondTrace = tr.startTrace('second-trace', 'second-trace', {'performance.enableStackFrames': false})
    secondTrace.end()

    tr.donePromise.then(function () {
      expect(firstTrace.frames).not.toBeUndefined()
      expect(secondTrace.frames).toBeUndefined()
      done()
    })
    tr.end()
  })
  it('should not generate stacktrace if the option is not passed', function (done) {
    var tr = new Transaction('/', 'transaction')

    var firstTrace = tr.startTrace('first-trace-signature', 'first-trace', {'performance.enableStackFrames': true})
    firstTrace.end()

    var secondTrace = tr.startTrace('second-trace', 'second-trace')
    secondTrace.end()

    tr.donePromise.then(function () {
      expect(firstTrace.frames).not.toBeUndefined()
      expect(secondTrace.frames).toBeUndefined()
      done()
    })
    tr.end()
  })
})
