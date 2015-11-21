var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  // HTTP Instrumentation
  $provide.decorator('$http', ['$delegate', '$injector', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'ext.http.request',
      prefix: 'angular.$http'
    })
  }])
}
