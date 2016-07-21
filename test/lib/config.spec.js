var Config = require('../../src/lib/config')

describe('config', function () {
  var config
  beforeEach(function () {
    config = Object.create(Config)
    config.init()
  })
  it('should merge configs with already set configs', function () {
    expect(config.get('debug')).toBe(false)
    expect(config.get('appId')).toBe(null)
    expect(config.get('orgId')).toBe(null)

    config.setConfig({
      appId: 'appId'
    })

    expect(config.get('debug')).toBe(false)
    expect(config.get('appId')).toBe('appId')
    expect(config.get('orgId')).toBe(null)

    config.setConfig({
      debug: true
    })

    expect(config.get('debug')).toBe(true)
    expect(config.get('appId')).toBe('appId')
    expect(config.get('orgId')).toBe(null)

    config.setConfig({
      debug: false,
      appId: null
    })

    expect(config.get('debug')).toBe(false)
    expect(config.get('appId')).toBe(null)
    expect(config.get('orgId')).toBe(null)
  })

  it('should deep merge configs', function () {
    expect(config.get('performance.enable')).toBe(true)
    expect(config.get('performance.enableStackFrames')).toBe(false)

    config.setConfig({
      performance: {
        enableStackFrames: true
      }
    })

    expect(config.get('performance.enable')).toBe(true)
    expect(config.get('performance.enableStackFrames')).toBe(true)
  })
})
