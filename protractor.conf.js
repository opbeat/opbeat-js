// conf.js
var isTravis = process.env.TRAVIS

var config = {
  framework: 'jasmine',
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['e2e_test/**/*.pspec.js']
}

if (isTravis) {
  config.capabilities = {
    'browserName': 'firefox'
  }
}

exports.config = config
