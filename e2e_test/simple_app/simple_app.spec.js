var utils = require('../e2e/utils')
describe('simple app', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('Inspect requests', function (done) {
    browser.url('/simple_app/index.html')
      // .setupInterceptor()
      .then(function () {
        setTimeout(function () {
          browser.execute(function () {
            return window.__httpInterceptor
          }).then(function testIt (ret) {
            // var requests = browser.getRequest(2)
            var requests = ret.value.requests

            // console.log(requests)
            expect(requests.length).toBe(4)
            done()
          })
        }, 6000)
      })
  })

  afterEach(utils.verifyNoBrowserErrors)
})
