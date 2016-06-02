var utils = require('../../e2e/utils')
describe('angular.ui router app', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('should run application without error', function (done) {
    browser.url('/angular/index.e2e.html')
      .executeAsync(function (cb) {
        window.runFixture('./minified_module_app/minified_module_app.js', ['../dist/dev/opbeat-angular.e2e.min.js', 'angular-ui-router'], {
          beforeInit: function (app, deps) {
            app.init({
              debug: true,
              orgId: '7f9fa667d0a349dd8377bc740bcfc33e',
              appId: '0a8757798e',
              performance: {
                enable: true,
                enableStackFrames: true
              }
            })
            cb('trs')
          },
          useNgApp: false,
          uiRouter: true
        })
      })
      .then(function (trs) {
        done()
      }, function (error) {
        console.log(error)
      })
  })

  afterEach(utils.verifyNoBrowserErrors)
})
