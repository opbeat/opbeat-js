var context = require('../../src/exceptions/context')

describe("isSourceMinified", function() {

  it("Empty source returns false", function() {
		expect(context.isSourceMinified('')).toBe(false)
  })

  it("Minified JS Bundle returns true", function() {
  	var source = require('./data/bundle.js')
		expect(context.isSourceMinified(source)).toBe(true)
  })

})

