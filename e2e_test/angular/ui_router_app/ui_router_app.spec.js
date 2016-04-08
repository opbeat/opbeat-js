var utils = require('../../e2e/utils')
describe('angular.ui router app', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('should have correct number of transactions and traces', function (done) {
    browser.url('/angular/index.e2e.html')
      .timeoutsAsyncScript(5000)
      .executeAsync(function (cb) {
        window.runFixture('./ui_router_app/ui_router_app.js', ['./angular-opbeat.e2e.js', 'angular-ui-router'], {
          beforeInit: function (app, deps) {
            deps[0]()
            window.e2e.getTransactions(function (trs) {
              cb(trs)
            }, 0, 1)
            app.init({
              debug: true,
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
      .then(function (response) {
        var transactions = response.value
        expect(transactions.length).toBe(1)

        var first = transactions[0]

        expect(first.traces.groups.length).toBe(12)
        expect(first.traces.raw[0].length).toBe(15)
        expect(first.transactions.length).toBe(1)
        expect(first.transactions[0].transaction).toBe('exponentialstate')

        done()
      }, function (error) {
        console.log(error)
      })
  })

  it('should not send any transaction if config is not valid', function (done) {
    browser.url('/angular/index.e2e.html')
      .timeoutsAsyncScript(5000)
      .executeAsync(function (cb) {
        window.runFixture('./ui_router_app/ui_router_app.js', ['./angular-opbeat.e2e.js', 'angular-ui-router'], {
          beforeInit: function (app, deps) {
            deps[0]()
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
