// var utils = require('../../e2e/utils')
describe('minified_module_app.failsafe', function () {
  it('should run application without error', function (done) {
    browser
      .url('/angular/index.e2e.html')
      .executeAsync(function (cb) {
        window.e2eUtils.runFixture('./minified_module_app/minified_module_app.js', ['../../dist/dev/opbeat-angular.min.js', 'angular', 'angular-ui-router'], {
          beforeInit: function (app, deps) {
            var errors = []
            window.onerror = function (error, url, line) {
              errors.push(error)
              console.log(error)
            }

            var e2e = window.e2e || (window.e2e = {})
            e2e.appInitialized = function () {
              cb(errors)
            }
            app.init({
              debug: false,
              orgId: '7f9fa667d0a349dd8377bc740bcfc33e',
              appId: '0a8757798e',
              performance: {
                enable: true,
                enableStackFrames: true
              }
            })
          },
          useNgApp: false,
          uiRouter: true
        })
      })
      .then(function (trs) {
        var errors = trs.value
        expect(errors.length).toBe(0)
        console.log('errors: ', errors)
        done()
      }, function (error) {
        console.log(error)
      })
  })

  // afterEach(utils.verifyNoBrowserErrors)
})
