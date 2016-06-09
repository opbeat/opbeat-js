var Config = require('../../src/lib/config')
var OpbeatBackend = require('../../src/backend/opbeat_backend')
var logger = require('loglevel')

var Transaction = require('../../src/transaction/transaction')

function TransportMock () {
  this.transportData = []
  this.sendTransaction = function (data) {
    this.transportData.push(data)
  }
}

describe('backend.OpbeatBackend', function () {
  var config
  var transportMock
  var opbeatBackend
  beforeEach(function () {
    config = Object.create(Config)
    config.init()
    transportMock = new TransportMock()
    spyOn(transportMock, 'sendTransaction').and.callThrough()
    spyOn(logger, 'warn')
    spyOn(logger, 'debug')
    opbeatBackend = new OpbeatBackend(transportMock, logger, config)
  })

  it('should call sendTransctions', function () {
    config.setConfig({ appId: 'test', orgId: 'test', isInstalled: true })
    expect(config.isValid()).toBe(true)
    opbeatBackend.sendTransactions([])
    expect(transportMock.sendTransaction).toHaveBeenCalledWith(Object({ transactions: [], traces: Object({ groups: [], raw: [] }) }))
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should not send any transactions if the config is not valid', function () {
    expect(config.isValid()).toBe(false)
    opbeatBackend.sendTransactions([])
    expect(logger.debug).toHaveBeenCalledWith('Config is not valid')
    expect(transportMock.sendTransaction).not.toHaveBeenCalled()
  })

  it('should not send frames with length === 0', function (done) {
    config.setConfig({ appId: 'test', orgId: 'test', isInstalled: true })
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

  it('should group small continuously similar traces', function (done) {
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.startTrace('signature', 'type').end()
    tr.startTrace('signature', 'type').end()
    tr.startTrace('signature', 'type').end()
    tr.startTrace('signature', 'type').end()
    setTimeout(function () {
      tr.end()
      var grouped = opbeatBackend.groupSmallContinuouslySimilarTraces(tr)
      expect(grouped.length).toBe(2)
      expect(grouped[1].signature).toBe('4x signature')
      done()
    })
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
})
