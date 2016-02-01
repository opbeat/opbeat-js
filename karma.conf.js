module.exports = function (config) {
  var cfg = {
    files: [
      'test/**/*.spec.js',
      { pattern: 'test/exceptions/data/*.js', included: false, watched: false }
    ],
    frameworks: ['browserify', 'jasmine'],
    preprocessors: {
      'test/**/*.spec.js': ['browserify']
    },
    plugins: [
      'karma-failed-reporter',
      'karma-jasmine',
      'karma-spec-reporter',
      'karma-browserify'
    ],
    browsers: [], // Chrome, Firefox, PhantomJS2
    reporters: ['spec', 'failed'],
    browserify: {
      debug: true,
      configure: function (bundle) {
        var proxyquire = require('proxyquireify')
        bundle
          .plugin(proxyquire.plugin)
      }
    }
  }

  if (process.env.TRAVIS) {
    // 'karma-chrome-launcher',
    cfg.plugins.push('karma-firefox-launcher')
    cfg.browsers.push('Firefox')
  } else {
    cfg.plugins.push('karma-phantomjs2-launcher')
    cfg.browsers.push('PhantomJS2')
  }

  config.set(cfg)
}
