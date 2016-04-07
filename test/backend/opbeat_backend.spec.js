var Config = require('../../src/lib/config')
var OpbeatBackend = require('../../src/backend/opbeat_backend')
var logger = require('loglevel')

function TransportMock () {
  this.sendTransaction = function (data) {}
}

describe('backend.OpbeatBackend', function () {
  var config
  var transportMock
  var opbeatBackend
  beforeEach(function () {
    config = Object.create(Config)
    config.init()
    transportMock = new TransportMock()
    spyOn(transportMock, 'sendTransaction')
    spyOn(logger, 'warn')
    opbeatBackend = new OpbeatBackend(transportMock, logger, config)
  })

  it('should call sendTransctions', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    expect(config.isValid()).toBe(true)
    opbeatBackend.sendTransactions([])
    expect(transportMock.sendTransaction).toHaveBeenCalledWith(Object({ transactions: [], traces: Object({ groups: [], raw: [] }) }))
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should not send any transactions if the config is not valid', function () {
    expect(config.isValid()).toBe(false)
    opbeatBackend.sendTransactions([])
    expect(logger.warn).toHaveBeenCalledWith('Config is not valid')
    expect(transportMock.sendTransaction).not.toHaveBeenCalled()
  })
})
