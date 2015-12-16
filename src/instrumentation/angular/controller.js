var utils = require('../utils')
var transactionStore = require('../transactionStore')

module.exports = function ($provide, traceBuffer) {
  // Controller Instrumentation
  $provide.decorator('$controller', ['$delegate', '$injector', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var controllerInfo = utils.getControllerInfoFromArgs(args)

      if(controllerInfo.name) { // Only instrument controllers with a name
        return utils.instrumentModule($delegate, $injector, {
          traceBuffer: traceBuffer,
          instrumentConstructor: true,
          type: 'app.$controller',
          prefix: '$controller.' + controllerInfo.name
        }).apply(this, arguments)
      }

      return $delegate.apply(this, args)
    }
  }])
}
