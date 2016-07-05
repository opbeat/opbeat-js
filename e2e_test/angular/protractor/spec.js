describe('opbeat-angular Protractor', function () {
  it('should have a title', function () {
    browser.get('http://localhost:8000/angular/protractor/index.html')

    expect(browser.getTitle()).toEqual('opbeat-angular')
  })
})
