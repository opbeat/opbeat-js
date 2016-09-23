var Opbeat = require('../../src/opbeat-js/opbeatPlain')
var ServiceFactory = require('../../src/common/serviceFactory')
var Config = require('../../src/lib/config')
var TransportMock = require('../utils/transportMock')

describe('opbeat-js', function () {
  var originalOnError
  var logger
  var config
  var serviceFactory

  beforeEach(function () {
    originalOnError = window.onerror
    serviceFactory = new ServiceFactory()
    config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config
    serviceFactory.services['Logger'] = logger = Object.create(serviceFactory.getLogger())
    serviceFactory.services['Transport'] = new TransportMock()
    spyOn(logger, 'debug')
  })

  it('should install window.onerror', function () {
    window.onerror = undefined
    var opbeat = new Opbeat(serviceFactory)
    opbeat.config({appId: 'test', orgId: 'test'})
    expect(typeof window.onerror).toBe('function')
  })

  xit('should capture exceptions', function (done) {
    var opbeat = new Opbeat(serviceFactory)
    opbeat.config({appId: 'test', orgId: 'test'})
    var transport = serviceFactory.services['Transport']
    expect(transport.errors).toEqual([])
    transport.subscribe(function (event, errorData) {
      if (event === 'sendError') {
        expect(errorData.data.message).toBe('Error: test error')
        done()
      }
    })
    opbeat.captureException(new Error('test error'))
  })

  afterEach(function () {
    window.onerror = originalOnError
  })
})
