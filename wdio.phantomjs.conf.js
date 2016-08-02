var config = require('./wdio.conf.js').config
config.capabilities = [
  {
    maxInstances: 1,
    browserName: 'phantomjs',
    'phantomjs.binary.path': require('phantomjs2').path
  }
]

config.specs = [
  './e2e_test/**/*.failsafe.js'
]

exports.config = config
