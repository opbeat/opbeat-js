var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  try {
    // todo this instrumentation fails if ngResource doesn't exist, or referenced after opbeat module
    // todo should check if performance monitoring is enabled on caller function
    // todo this is not good place to check if opbeat is installed
    // todo make resource instrumentation testable

    // ngResource instrumentation
    $provide.decorator('$resource', ['$delegate', '$injector', function ($delegate, $injector) {
      var options = {
        traceBuffer: traceBuffer,
        prefix: '$resource',
        type: 'ext.$resource',
        signatureFormatter: function (key, args) {
          var url = (typeof args[0] === 'string') ? args[0] : options.wrapper.args[0]
          return ['$resource', key.toUpperCase(), url].join(' ')
        }
      }
      return utils.instrumentModule($delegate, $injector, options)
    }])
  } catch (e) {}
}
