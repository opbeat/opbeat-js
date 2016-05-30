var utils = require('../../e2e/utils')
describe('minified_module_app', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('should have correct number of transactions and traces', function (done) {
    browser.url('/angular/index.e2e.html')
      .executeAsync(function (cb) {
        window.runFixture('./minified_module_app/minified_module_app.js', ['../dist/dev/angular-opbeat.e2e.min.js', 'angular-ui-router'], {
          beforeInit: function (app, deps) {
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

        transactions[0].traces.groups.forEach(function (g) {
          var frames = g.extra._frames
          if (typeof frames !== 'undefined') {
            expect(frames.length).toBeGreaterThan(0)
          }
        })
        expect(transactions.length).toBe(1)

        var first = transactions[0]

        expect(first.traces.groups.length).toBe(12)
        expect(first.traces.raw[0].length).toBe(16)
        expect(first.transactions.length).toBe(1)
        expect(first.transactions[0].transaction).toBe('exponentialstate')

        done()
      }, function (error) {
        console.log(error)
      })
  })

  afterEach(utils.verifyNoBrowserErrors)
})
