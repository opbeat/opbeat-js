// todo(refactor) context's dependencies are not mocked
var context = require('../../src/exceptions/context')

describe('exceptions.context', function () {
  describe('.isSourceMinified', function () {
    it('Empty source returns false', function () {
      expect(context.isSourceMinified('')).toBe(false)
    })

    it('Minified JS Bundle returns true', function () {
      var source = require('./data/bundle.js')
      expect(context.isSourceMinified(source)).toBe(true)
    })
  })

  describe('._findSourceMappingURL', function () {
    it('should find sourceMappingURL in one line comment', function () {
      var fileContents = [
        '(function(){})',
        '//# sourceMappingURL=../source/map/url.js.map'
      ]

      var source = fileContents.join('\n')
      expect(context._findSourceMappingURL(source)).toBe('../source/map/url.js.map')
    })
    it('should find sourceMappingURL if there are whitespaces at the end of file', function () {
      var fileContents = [
        '(function(){})',
        '//# sourceMappingURL=../source/map/url.js.map',
        '',
        '     '
      ]
      var source = fileContents.join('\n')
      expect(context._findSourceMappingURL(source)).toBe('../source/map/url.js.map')
    })
    it('should return null if the sourceMappingURL comment is not at the end of file', function () {
      var fileContents = [
        '(function(){})',
        '//# sourceMappingURL=../source/map/url.js.map',
        '     ',
        '(function(){})',
        '     '
      ]
      var source = fileContents.join('\n')
      expect(context._findSourceMappingURL(source)).toBe(null)
    })
  })

  describe('.getFileSourceMapUrl', function () {
    it('should find sourceMappingUrl in a bundle', function (done) {
      var fileUrl = '/base/test/exceptions/data/bundle_sourcemap.js'

      context.getFileSourceMapUrl(fileUrl).then(function (sourceMappingUrl) {
        expect(sourceMappingUrl).toContain('../maps/libs.min-599f6fba.js.map')
        done()
      }, function (reason) {
        fail(reason)
        done()
      })
    })
  })
})
