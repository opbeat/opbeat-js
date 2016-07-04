exports.config = {
  //
  // ==================
  // Specify Test Files
  // ==================
  // Define which test specs should run. The pattern is relative to the directory
  // from which `wdio` was called. Notice that, if you are calling `wdio` from an
  // NPM script (see https://docs.npmjs.com/cli/run-script) then the current working
  // directory is where your package.json resides, so `wdio` will be called from there.
  //
  specs: [
    './e2e_test/**/*.spec.js'
  ],
  // Patterns to exclude.
  exclude: [
    './e2e_test/node_modules/**/*.*'
  // 'path/to/excluded/files'
  ],
  maxInstances: 1,

  //
  // ============
  // Capabilities
  // ============
  // Define your capabilities here. WebdriverIO can run multiple capabilties at the same
  // time. Depending on the number of capabilities, WebdriverIO launches several test
  // sessions. Within your capabilities you can overwrite the spec and exclude option in
  // order to group specific specs to a specific capability.
  //
  // If you have trouble getting all important capabilities together, check out the
  // Sauce Labs platform configurator - a great tool to configure your capabilities:
  // https://docs.saucelabs.com/reference/platforms-configurator
  //
  capabilities: [
    // {
    //   browserName: 'phantomjs',
    //   'phantomjs.binary.path': require('phantomjs').path
    // },
    {
      maxInstances: 1,
      browserName: 'chrome',
      'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
      before: function () {
        browser.timeoutsAsyncScript(30000)
      }
    }
    // {
    //   maxInstances: 1,
    //   browserName: 'internet explorer'
    // },
    // {
    //   browserName: 'internet explorer',
    //   maxInstances: 1,
    //   'platform': 'Windows 7',
    //   'version': '9.0',
    //   specs: [
    //     '/e2e_test/**/*.ie9.spec.js'
    //   ],
    //   baseUrl: 'http://localhost:8000',
    //   initialBrowserUrl: 'about:blank',
    //   before: function () {
    //     browser.timeoutsAsyncScript(15000)
    //   }
    // }
  ],
  //
  // ===================
  // Test Configurations
  // ===================
  // Define all options that are relevant for the WebdriverIO instance here
  //
  // Level of logging verbosity: silent | verbose | command | data | result | error
  logLevel: 'command',
  //
  // Enables colors for log output.
  coloredLogs: true,
  //
  // Saves a screenshot to a given path if a command fails.
  screenshotPath: './errorShots/',
  //
  // Set a base URL in order to shorten url command calls. If your url parameter starts
  // with "/", the base url gets prepended.
  baseUrl: 'http://localhost:8000',
  //
  // Default timeout for all waitForXXX commands.
  waitforTimeout: 10000,
  //
  // Initialize the browser instance with a WebdriverIO plugin. The object should have the
  // plugin name as key and the desired plugin options as property. Make sure you have
  // the plugin installed before running any tests. The following plugins are currently
  // available:
  // WebdriverCSS: https://github.com/webdriverio/webdrivercss
  // WebdriverRTC: https://github.com/webdriverio/webdriverrtc
  // Browserevent: https://github.com/webdriverio/browserevent
  // plugins: {
  // webdrivercss: {
  //     screenshotRoot: 'my-shots',
  //     failedComparisonsRoot: 'diffs',
  //     misMatchTolerance: 0.05,
  //     screenWidth: [320,480,640,1024]
  // },
  // webdriverrtc: {},
  // browserevent: {}
  // },
  //
  // Framework you want to run your specs with.
  // The following are supported: mocha, jasmine and cucumber
  // see also: http://webdriver.io/guide/testrunner/frameworks.html
  //
  // Make sure you have the node package for the specific framework installed before running
  // any tests. If not please install the following package:
  // Mocha: `$ npm install mocha`
  // Jasmine: `$ npm install jasmine`
  // Cucumber: `$ npm install cucumber`
  framework: 'jasmine',
  //
  // Test reporter for stdout.
  // The following are supported: dot (default), spec and xunit
  // see also: http://webdriver.io/guide/testrunner/reporters.html
  reporter: 'spec',

  //
  // Options to be passed to Jasmine.
  jasmineNodeOpts: {
    //
    // Jasmine default timeout
    defaultTimeoutInterval: 60000,
    //
    // The Jasmine framework allows it to intercept each assertion in order to log the state of the application
    // or website depending on the result. For example it is pretty handy to take a screenshot everytime
    // an assertion fails.
    expectationResultHandler: function (passed, assertion) {
      /**
       * only take screenshot if assertion failed
       */
      if (passed) {
        return
      }

      var title = assertion.message.replace(/\s/g, '-')
      browser.saveScreenshot(('./errorShots/assertionError_' + title + '.png'))
    }
  },

  //
  // =====
  // Hooks
  // =====
  // Run functions before or after the test. If one of them returns with a promise, WebdriverIO
  // will wait until that promise got resolved to continue.
  //
  // Gets executed before all workers get launched.
  onPrepare: function () {
    // do something
  },
  //
  // Gets executed before test execution begins. At this point you will have access to all global
  // variables like `browser`. It is the perfect place to define custom commands.
  before: function () {
    // do something
    browser.timeoutsAsyncScript(30000)

    // check if the environment contains a specific angular version
    // that we will be testing for
    console.log('Environment ANGULAR_VERSION: ' + process.env.ANGULAR_VERSION)
    if (process.env.ANGULAR_VERSION) {
      var versionString = process.env.ANGULAR_VERSION.replace('~', '')
      var versionArray = versionString.split('.')
      var version = {
        major: parseInt(versionArray[0], 10),
        minor: parseInt(versionArray[1], 10),
        patch: parseInt(versionArray[2], 10),
        full: versionString
      }

      browser.expectedAngularVersion = version
    }
    else {
      // otherwise we manually set the version to the latest major/minor combination
      browser.expectedAngularVersion = { major: 1, minor: 5, patch: 0, full: '1.5.0' }
    }
  },
  //
  // Gets executed after all tests are done. You still have access to all global variables from
  // the test.
  after: function (failures, pid) {
    // do something
  },
  //
  // Gets executed after all workers got shut down and the process is about to exit. It is not
  // possible to defer the end of the process using a promise.
  onComplete: function () {
    // do something
  }
}
