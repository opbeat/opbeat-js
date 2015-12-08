module.exports = function(config) {
  config.set({
    files: [
      'test/**/*.spec.js'
    ],
    frameworks: ['browserify', 'jasmine'],
    preprocessors: {
      'test/**/*.spec.js': ['browserify']
    },
    browsers: ['PhantomJS'],
    reporters: ['spec', 'failed'],
    browserify: {
      debug: true
    }
  })
};
