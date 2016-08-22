var utils = require('../../e2e/utils')
describe('angular.ui_router_app', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('should have correct number of transactions and traces', function (done) {
    browser.url('/angular/index.e2e.html')
      .executeAsync(function (cb) {
        window.e2eUtils.runFixture('./ui_router_app/ui_router_app.js', ['./opbeat-angular.e2e.js', 'angular', 'angular-ui-router'], {
          beforeInit: function (app, deps) {
            window.e2e.getTransactions(function (trs) {
              cb(trs)
            }, 0, 1)
            app.init({
              debug: true,
              orgId: '7f9fa667d0a349dd8377bc740bcfc33e',
              appId: '6664ca4dfc',
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
      .then(function (response) {
        var transactions = response.value
        expect(transactions.length).toBe(1)

        var first = transactions[0]

        expect(first.traces.groups.length).toBeGreaterThan(11)
        expect(first.traces.raw[0].length).toBeGreaterThan(16)
        expect(first.transactions.length).toBe(1)
        expect(first.transactions[0].transaction).toBe('ui_router_app_exponentialstate.substate')

        done()
      }, function (error) {
        console.log(error)
      })
  })

  it('should not send any transaction if config is not valid', function (done) {
    browser.url('/angular/index.e2e.html')
      .executeAsync(function (cb) {
        window.e2eUtils.runFixture('./ui_router_app/ui_router_app.js', ['angular', './opbeat-angular.e2e.js', 'angular-ui-router'], {
          beforeInit: function (app, deps) {
            setTimeout(function () {
              cb([])
            }, 1000)

            window.e2e.getTransactions(function (trs) {
              cb(trs)
            }, 0, 1)
            app.init({
              debug: true,
              // orgId: null,
              // appId: null,
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
      .then(function (response) {
        var transactions = response.value
        expect(transactions.length).toBe(0)
        done()
      }, function (error) {
        console.log(error)
      })
  })

  afterEach(utils.verifyNoBrowserErrors)
})
