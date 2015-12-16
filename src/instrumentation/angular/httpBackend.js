var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  // $httpBackend instrumentation
  $provide.decorator('$httpBackend', ['$delegate', '$injector', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)

      var result = utils.instrumentMethodWithCallback($delegate, '$httpBackend', 'ext.$httpBackend', {
        prefix: '$httpBackend',
        callbackIndex: 3,
        traceBuffer: traceBuffer,
        signatureFormatter: function (key, args) {
          var text = ['$httpBackend', args[0].toUpperCase(), args[1]]
          return text.join(' ')
        }
      }).apply(this, args)
      return result
    }
  }])
}
