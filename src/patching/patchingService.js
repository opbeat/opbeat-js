var patchUtils = require('./patchUtils')

var urlSympbol = patchUtils.opbeatSymbol('url')
var methodSymbol = patchUtils.opbeatSymbol('method')
var isAsyncSymbol = patchUtils.opbeatSymbol('isAsync')

function patchingService () {
}

patchingService.prototype.patchXMLHttpRequest = function () {
  patchUtils.patchMethod(window.XMLHttpRequest.prototype, 'open', function (delegate) {
    return function (self, args) {
      self[methodSymbol] = args[0]
      self[urlSympbol] = args[1]
      self[isAsyncSymbol] = args[2]
      delegate.apply(self, args)
    }
  })
}

patchingService.prototype.patchAll = function () {
  this.patchXMLHttpRequest()
}

module.exports = patchingService
