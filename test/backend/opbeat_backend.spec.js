var Config = require('../../src/lib/config')
var OpbeatBackend = require('../../src/backend/opbeat_backend')
var logger = Object.create(require('loglevel'))

var Transaction = require('../../src/transaction/transaction')
var ExceptionHandler = require('../../src/exceptions/exceptionHandler')

function TransportMock () {
  this.transportData = []
  this.sendTransaction = function (data) {
    this.transportData.push(data)
  }
  this.sendError = function () {}
}

describe('OpbeatBackend', function () {
  var config
  var transportMock
  var opbeatBackend
  beforeEach(function () {
    config = Object.create(Config)
    config.init()
    transportMock = new TransportMock()
    spyOn(transportMock, 'sendTransaction').and.callThrough()
    spyOn(transportMock, 'sendError')
    spyOn(logger, 'warn')
    spyOn(logger, 'debug')
    opbeatBackend = new OpbeatBackend(transportMock, logger, config)
  })

  it('should not send transctions when the list is empty', function () {
    config.setConfig({ appId: 'test', orgId: 'test', isInstalled: true })
    expect(config.isValid()).toBe(true)
    opbeatBackend.sendTransactions([])
    expect(transportMock.sendTransaction).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should not send any transactions if the config is not valid', function () {
    expect(config.isValid()).toBe(false)
    opbeatBackend.sendTransactions([])
    expect(logger.debug).toHaveBeenCalledWith('Config is not valid')
    expect(transportMock.sendTransaction).not.toHaveBeenCalled()
  })

  it('should not send frames with length === 0', function (done) {
    config.setConfig({
      appId: 'test', orgId: 'test', isInstalled: true,
      performance: {
        checkBrowserResponsiveness: false,
        groupSimilarTraces: false
      }
    })
    expect(config.isValid()).toBe(true)

    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.startTrace().end()
    tr.end()

    tr.donePromise.then(function () {
      opbeatBackend.sendTransactions([tr])
      var groups = transportMock.transportData[0].traces.groups
      groups.forEach(function (g) {
        var frame = g.extra._frames
        if (typeof frame !== 'undefined') {
          expect(frame.length).toBeGreaterThan(0)
        }
      })
      done()
    })
  })

  it('should group small continuously similar traces', function () {
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    var trace1 = tr.startTrace('signature', 'type')
    trace1.end()
    var trace2 = tr.startTrace('signature', 'type')
    trace2.end()
    var trace3 = tr.startTrace('signature', 'type')
    trace3.end()
    var trace4 = tr.startTrace('signature', 'type')
    trace4.end()

    tr.end()

    tr._rootTrace._start = 10
    tr._rootTrace._end = 1000

    trace1._start = 20
    trace1._end = 30

    trace2._start = 31
    trace2._end = 35

    trace3._start = 35
    trace3._end = 45

    trace4._start = 50
    trace4._end = 60

    tr.traces.sort(function (traceA, traceB) {
      return traceA._start - traceB._start
    })
    var grouped = opbeatBackend.groupSmallContinuouslySimilarTraces(tr, 0.05)
    expect(grouped.length).toBe(2)
    expect(grouped[1].signature).toBe('4x signature')
  })

  it('should not group small similar traces by default', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    expect(config.isValid()).toBe(true)
    expect(config.get('performance.groupSimilarTraces')).toBe(false)
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.startTrace('signature', 'type').end()
    spyOn(opbeatBackend, 'groupSmallContinuouslySimilarTraces')
    tr.end()
    opbeatBackend.sendTransactions([tr])
    expect(opbeatBackend.groupSmallContinuouslySimilarTraces).not.toHaveBeenCalled()
  })

  it('should not send errors if the config is not valid', function () {
    expect(config.isValid()).toBe(false)
    var exc = new ExceptionHandler(opbeatBackend)
    exc.processError(new Error()).then(function () {
      expect(logger.debug).toHaveBeenCalledWith('Config is not valid')
      expect(transportMock.sendError).not.toHaveBeenCalled()
    })
  })

  it('should calculate browser responsiveness', function () {
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.end()

    tr._rootTrace._start = 1

    tr._rootTrace._end = 400
    tr.browserResponsivenessCounter = 0
    var resp = opbeatBackend.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 1001
    tr.browserResponsivenessCounter = 2
    resp = opbeatBackend.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 1601
    tr.browserResponsivenessCounter = 2
    resp = opbeatBackend.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 3001
    tr.browserResponsivenessCounter = 3
    resp = opbeatBackend.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(false)
  })

  it('should check browser responsiveness based on config', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    expect(config.isValid()).toBe(true)

    config.setConfig({
      performance: {
        checkBrowserResponsiveness: false
      }
    })

    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.end()

    tr._rootTrace._start = 1
    tr._rootTrace._end = 1001
    tr.browserResponsivenessCounter = 0

    spyOn(opbeatBackend, 'checkBrowserResponsiveness').and.callThrough()

    opbeatBackend.sendTransactions([tr])

    expect(opbeatBackend.checkBrowserResponsiveness).not.toHaveBeenCalled()
    expect(transportMock.sendTransaction).toHaveBeenCalled()

    config.setConfig({
      performance: {
        checkBrowserResponsiveness: true
      }
    })

    transportMock.sendTransaction.calls.reset()
    opbeatBackend.sendTransactions([tr])
    expect(opbeatBackend.checkBrowserResponsiveness).toHaveBeenCalled()
    expect(transportMock.sendTransaction).toHaveBeenCalled()

    tr._rootTrace._start = 1
    tr._rootTrace._end = 3001
    tr.browserResponsivenessCounter = 1

    transportMock.sendTransaction.calls.reset()
    opbeatBackend.sendTransactions([tr])
    expect(opbeatBackend.checkBrowserResponsiveness).toHaveBeenCalled()
    expect(transportMock.sendTransaction).not.toHaveBeenCalled()
  })
})
