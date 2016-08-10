var config = require('./wdio.conf.js').config
config.capabilities = [
  {
    maxInstances: 1,
    browserName: 'chrome',
    'version': '45',
    name: 'e2e',
    before: function () {
      browser.timeoutsAsyncScript(30000)
    }
  }
]

config.specs = [
  './test/e2e/**/*.e2e-spec.js'
]

exports.config = config
