var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  return {
    instrumentationAll: function (modules) {
      modules.forEach(function (name) {
        $provide.decorator(name, function ($delegate, $injector) {
          utils.instrumentObject($delegate, $injector, {
            type: 'angular.factory',
            prefix: name
          })
          return $delegate
        })
      })
    }
  }
}
