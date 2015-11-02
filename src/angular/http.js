var utils = require('../instrumentation/utils')

module.exports = function($provide, traceBuffer) {

  // HTTP Instrumentation
  $provide.decorator('$http', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'ext.http.request',
      prefix: 'angular.$http',
      signatureFormatter: function (key, args) {
        var text = []
        // $http used directly
        if (key && args) {
          text = ['$http', key.toUpperCase(), args[0]]
        } else if (!key && typeof args === 'object') {
          // $http used from $resource
          var req = args[0]
          text = ['$http', req.method, req.url]
        }

        return text.join(' ')
      }
    })
  })

}