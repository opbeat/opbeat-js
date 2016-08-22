var utils = require('../../e2e/utils')

describe('angular.simple_app', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('should have correct number of transactions and traces', function (done) {
    browser.url('/angular/index.e2e.html')
      .executeAsync(function (cb) {
        window.e2eUtils.runFixture('./simple_app/simple_app.js', ['angular', './opbeat-angular.e2e.js', 'angular-route'], {
          beforeInit: function (app, deps) {
            window.e2e.getTransactions(function (trs) {
              cb(trs)
            }, 0, 1)
            app.init()
          },
          appName: 'simple_app',
          useNgApp: undefined,
          uiRouter: false
        })
      })
      .then(function (response) {
        var transactions = response.value
        // console.log('transactions', transactions)
        expect(transactions.length).toBe(1)

        var first = transactions[0]
        expect(first.traces.groups.length).toBeGreaterThan(7)
        expect(first.traces.raw[0].length).toBeGreaterThan(11)
        expect(first.transactions.length).toBe(1)
        expect(first.transactions[0].transaction).toBe('/')

        done()
      }, function (error) {
        console.log(error)
      })
  })

  it('should have correct number of transactions and traces using ng-app', function (done) {
    browser.url('/angular/index.ngApp.html')
      .executeAsync(function (cb) {
        window.simple_app.init()
        window.e2e.getTransactions(function (trs) {
          cb(trs)
        }, 0, 1)
      })
      .then(function (response) {
        var transactions = response.value
        expect(transactions.length).toBe(1)

        var first = transactions[0]
        expect(first.traces.groups.length).toBeGreaterThan(7)
        expect(first.traces.raw[0].length).toBeGreaterThan(11)
        expect(first.transactions.length).toBe(1)
        expect(first.transactions[0].transaction).toBe('/')

        done()
      }, function (error) {
        console.log(error)
      })
  })

  it('should be running the correct major/minor version of angular', function (done) {
    browser.url('/angular/index.e2e.html').then(function () {
      browser.executeAsync(function (cb) {
        window.e2eUtils.loadDependencies(['angular'], function () {
          cb(window.angular.version)
        })
      }).then(function (response) {
        var version = response.value
        console.log('Browser angular version: ' + version.full)
        console.log('Expected angular version: ' + browser.expectedAngularVersion.full)

        expect(version.major).toEqual(browser.expectedAngularVersion.major)
        expect(version.minor).toEqual(browser.expectedAngularVersion.minor)

        done()
      })
    })
  })

  afterEach(utils.verifyNoBrowserErrors)
})
