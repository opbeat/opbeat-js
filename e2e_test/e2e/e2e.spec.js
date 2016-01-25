describe('webdriver.io test', function () {
  it('should have the right title', function (done) {
    browser.url('/e2e/index.html').then(function () {
      browser.getTitle()
        .then(function (title, err) {
          expect(err).toBeFalsy()
          expect(title).toBe('it works')
          console.log(arguments)
          done()
        })
    })
  })
})
