var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  return {
    instrumentAll: function (modules) {
      modules.forEach(function (name) {
        $provide.decorator(name, ['$delegate', '$injector', function ($delegate, $injector) {
          utils.instrumentObject($delegate, $injector, {
            type: 'angular.factory',
          prefix: 'app.factory.' + name
          })
          return $delegate
        }])
      })
    }
  }
}
