var utils = require('../utils')
var transactionStore = require('../transactionStore')

module.exports = function ($provide, traceBuffer) {
  // Controller Instrumentation
  $provide.decorator('$controller', ['$delegate', '$injector', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var controllerInfo = utils.getControllerInfoFromArgs(args)

      return utils.instrumentModule($delegate, $injector, {
        type: 'app.$controller',
        prefix: '$controller.' + controllerInfo.name
      }).apply(this, arguments)

      return $delegate.apply(this, args)
    }
  }])
}
