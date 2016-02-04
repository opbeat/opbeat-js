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
            // var requests = browser.getRequest(2)
            var requests = ret.value.requests

            // console.log(requests[2])
            var intakeRequest = requests[2]
            expect(intakeRequest.requestedURL).toContain('https://intake.opbeat.com/api/')
            done()
          })
        }, 6000)
      })
  })

  afterEach(utils.verifyNoBrowserErrors)
})

