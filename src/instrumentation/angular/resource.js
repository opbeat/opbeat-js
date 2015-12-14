var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  try {
    // ngResource instrumentation
    $provide.decorator('$resource', ['$delegate', '$injector', function ($delegate, $injector) {
      return utils.instrumentStaticModule($delegate, $injector, {
        traceBuffer: traceBuffer,
        prefix: '$resource',
        type: 'ext.$resource',
        signatureFormatter: function (key, args) {
          return ['$resource', key.toUpperCase(), args[0]].join(' ')
        }
      })
    }])
  } catch (e) {}
}
