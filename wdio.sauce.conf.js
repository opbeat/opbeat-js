var config = require('./wdio.conf.js').config
config.capabilities = [
  {
    maxInstances: 1,
    browserName: 'chrome',
    'version': '45',
    'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
    before: function () {
      browser.timeoutsAsyncScript(30000)
    }
  }
]

config.specs = [
  './e2e_test/**/*.spec.js'
]

exports.config = config
