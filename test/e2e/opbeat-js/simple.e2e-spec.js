var utils = require('../e2e/utils')
describe('opbeat-js', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('should have a title', function (done) {
    browser.url('http://localhost:8000/opbeat-js/index.html')
      .then(function () {
        browser.getTitle()
          .then(function (title, err) {
            expect(err).toBeFalsy()
            expect(title).toEqual('opbeat-js')
            done()
          })
      })
  })

  afterEach(utils.verifyNoBrowserErrors)
})
