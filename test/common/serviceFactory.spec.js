describe('ServiceFactory', function () {
  var Config = require('../../src/lib/config')
  var ServiceFactory = require('../../src/common/serviceFactory')

  var config
  var logger
  beforeEach(function () {
    var serviceFactory = new ServiceFactory()
    config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config
    serviceFactory.services['Logger'] = logger = Object.create(serviceFactory.getLogger())
    spyOn(logger, 'debug')
  })

  it('should set correct log level', function () {
    expect(config.get('debug')).toBe(false)
    expect(config.get('logLevel')).toBe('warn')
    expect(logger.getLevel()).toBe(logger.levels.WARN)

    config.setConfig({debug: true})
    expect(config.get('debug')).toBe(true)
    expect(logger.getLevel()).toBe(logger.levels.DEBUG)

    config.setConfig({debug: false})
    expect(config.get('debug')).toBe(false)
    expect(logger.getLevel()).toBe(logger.levels.WARN)

    config.setConfig({logLevel: 'trace', debug: true})
    expect(logger.getLevel()).toBe(logger.levels.TRACE)

    config.setConfig({logLevel: 'warn', debug: false})
    expect(logger.getLevel()).toBe(logger.levels.WARN)
  })
})
