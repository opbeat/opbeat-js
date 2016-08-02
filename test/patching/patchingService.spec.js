var PatchingService = require('../../src/patching/patchingService')
var patchUtils = require('../../src/patching/patchUtils')

var urlSympbol = patchUtils.opbeatSymbol('url')
var methodSymbol = patchUtils.opbeatSymbol('method')

describe('PatchingService', function () {
  var patchingService = new PatchingService()
  patchingService.patchAll()

  it('should have correct url and method', function () {
    var req = new window.XMLHttpRequest()
    req.open('GET', '/', true)
    expect(req[urlSympbol]).toBe('/')
    expect(req[methodSymbol]).toBe('GET')
  })
})
