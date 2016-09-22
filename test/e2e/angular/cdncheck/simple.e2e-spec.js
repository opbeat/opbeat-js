var utils = require('../../e2e/utils')
describe('opbeat-angular cdncheck', function () {
  beforeEach(utils.verifyNoBrowserErrors)

  it('should have a title', function (done) {
    browser.url('http://localhost:8000/angular/cdncheck/index.html')
      .then(function () {
        browser.getTitle()
          .then(function (title, err) {
            expect(err).toBeFalsy()
            expect(title).toEqual('opbeat-angular')
            done()
          })
      })
  })

  afterEach(utils.verifyNoBrowserErrors)
})
