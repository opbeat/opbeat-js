var config = require('./wdio.conf.js').config
config.capabilities = [
  {
    browserName: 'internet explorer',
    maxInstances: 1,
    name: 'e2e:failsafe',
    'platform': 'Windows 7',
    'version': '9.0'
  }
]

config.specs = [
  './test/e2e/**/*.failsafe.js'
]

exports.config = config
