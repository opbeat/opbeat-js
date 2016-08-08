var xhrPatch = require('../../src/common/patches/xhrPatch')

var patchUtils = require('../../src/common/patchUtils')
var urlSympbol = patchUtils.opbeatSymbol('url')
var methodSymbol = patchUtils.opbeatSymbol('method')


describe('xhrPatch', function () {
  xhrPatch()

  it('should have correct url and method', function () {
    var req = new window.XMLHttpRequest()
    req.open('GET', '/', true)
    expect(req[urlSympbol]).toBe('/')
    expect(req[methodSymbol]).toBe('GET')
  })
})
