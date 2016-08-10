// conf.js
var isTravis = process.env.TRAVIS

var config = {
  framework: 'jasmine',
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['test/e2e/**/*.pspec.js']
}

if (isTravis) {
  config.capabilities = {
    'browserName': 'firefox'
  }
}

exports.config = config
