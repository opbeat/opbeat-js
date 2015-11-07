var utils = require('../utils')

module.exports = function($provide, traceBuffer) {

  // HTTP Instrumentation
  $provide.decorator('$http', function ($delegate, $injector) {

    console.log('$delegate', $delegate)
    return utils.instrumentModule($delegate, $injector, {
      type: 'ext.http.request',
      prefix: 'angular.$http'
    })
    
  })

}