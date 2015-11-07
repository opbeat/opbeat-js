var utils = require('../utils')

module.exports = function($provide, traceBuffer) {

  // Controller Instrumentation
  $provide.decorator('$controller', function ($delegate, $injector) {
    return function () {
      var $rootScope = $injector.get('$rootScope')
      var $location = $injector.get('$location')

      var args = Array.prototype.slice.call(arguments)
      var controllerInfo = utils.getControllerInfoFromArgs(args)
      var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]

      if (controllerInfo.name) {
        if (transaction && transaction.metadata.controllerName !== controllerInfo.name) {
          return utils.instrumentModule($delegate, $injector, {
            type: 'template.angular.controller',
            prefix: 'controller.' + controllerInfo.name
          }).apply(this, arguments)
        }
      }

      return $delegate.apply(this, args)
    }
  })

}
