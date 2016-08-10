var config = require('./wdio.conf.js').config
config.capabilities = [
  {
    maxInstances: 1,
    browserName: 'phantomjs',
    'phantomjs.binary.path': require('phantomjs2').path
  }
]

config.specs = [
  './test/e2e/**/*.failsafe.js'
]

exports.config = config
