var utils = require('../e2e/utils')
describe('simple app - requirejs', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('Inspect requests', function (done) {
    browser.url('/simple_app/requirejs_index.html')
      // .setupInterceptor()
      .then(function () {
        setTimeout(function () {
          browser.execute(function () {
            return window.__httpInterceptor
          }).then(function testIt (ret) {
            done()
          })
        }, 6000)
      })
  })

  afterEach(utils.verifyNoBrowserErrors)
})
