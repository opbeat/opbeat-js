var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  // $cacheFactory instrumentation (this happens before routeChange -> using traceBuffer)
  $provide.decorator('$cacheFactory', ['$delegate', '$injector', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var cacheName = args[0] + 'Cache'
      var result = $delegate.apply(this, args)
      utils.instrumentObject(result, $injector, {
        type: 'cache.' + cacheName,
        prefix: cacheName,
        transaction: traceBuffer,
        signatureFormatter: function (key, args) {
          var text = ['$cacheFactory', key.toUpperCase(), args[0]]
          return text.join(' ')
        }
      })
      return result
    }
  }])
}
