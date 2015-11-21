var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  try {
    // ngResource instrumentation
    $provide.decorator('$resource', ['$delegate', '$injector', function ($delegate, $injector) {
      return function () {
        var args = Array.prototype.slice.call(arguments)
        var result = $delegate.apply(this, args)
        utils.instrumentObject(result, $injector, {
          type: 'ext.$resource',
          prefix: '$resource',
          signatureFormatter: function (key, args) {
            var text = ['$resource', key.toUpperCase(), args[0]]
            return text.join(' ')
          }
        })
        return result
      }
    }])
  } catch (e) {
  }
}
