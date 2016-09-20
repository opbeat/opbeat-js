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

    lastTrace.end()
    transaction.detectFinish()

    expect(transaction._rootTrace._start).toBe(firstTrace._start)
    expect(transaction._rootTrace._end >= lastTrace._end).toBeTruthy()
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

    setTimeout(function () {
      longTrace.end()
      transaction.detectFinish()

      setTimeout(function () {
        expect(transaction._rootTrace._start).toBe(rootTraceStart)
        expect(transaction._rootTrace._end).toBeGreaterThan(longTrace._end)
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
    var tr = new Transaction('/', 'transaction', {'enableStackFrames': true})

    var firstTrace = tr.startTrace('first-trace-signature', 'first-trace')
    firstTrace.end()

    var secondTrace = tr.startTrace('second-trace', 'second-trace', {'enableStackFrames': false})
    secondTrace.end()

    tr.donePromise.then(function () {
      expect(firstTrace.frames).not.toBeUndefined()
      expect(secondTrace.frames).toBeUndefined()
    })

    var noStackTrace = new Transaction('/', 'transaction', {'enableStackFrames': false})
    var thirdTrace = noStackTrace.startTrace('third-trace', 'third-trace', {'enableStackFrames': true})
    thirdTrace.end()

    noStackTrace.donePromise.then(function () {
      expect(thirdTrace.frames).toBeUndefined()
    })

    Promise.all([tr.donePromise, noStackTrace.donePromise]).then(function () {
      done()
    })

    tr.detectFinish()
    noStackTrace.detectFinish()
  })
  it('should not generate stacktrace if the option is not passed', function (done) {
    var tr = new Transaction('/', 'transaction')

    var firstTrace = tr.startTrace('first-trace-signature', 'first-trace', {'enableStackFrames': true})
    firstTrace.end()

    var secondTrace = tr.startTrace('second-trace', 'second-trace')
    secondTrace.end()

    tr.donePromise.then(function () {
      expect(firstTrace.frames).toBeUndefined()
      expect(secondTrace.frames).toBeUndefined()
      done()
    })
    tr.end()
  })

  it('should store contextInfo.browser.location', function () {
    var tr = new Transaction('/', 'transaction')
    var location = tr.contextInfo.browser.location
    expect(typeof location).toBe('string')
  })
})
