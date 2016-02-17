var Config = require('../../src/lib/config')

var config = Config
config.init()
describe('config', function () {
  it('should merge configs with already set configs', function () {
    expect(config.get('debug')).toBe(undefined)
    expect(config.get('appId')).toBe(null)

    config.setConfig({
      appId: 'appId'
    })

    expect(config.get('debug')).toBe(undefined)
    expect(config.get('appId')).toBe('appId')

    config.setConfig({
      debug: true
    })

    expect(config.get('debug')).toBe(true)
    expect(config.get('appId')).toBe('appId')

    config.setConfig({
      debug: false
    })

    expect(config.get('debug')).toBe(false)
    expect(config.get('appId')).toBe('appId')
  })
})
