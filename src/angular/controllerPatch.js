var utils = require('../lib/utils')

function getControllerInfoFromArgs (args) {
  var scope, name

  if (typeof args[0] === 'string') {
    name = args[0]
  } else if (typeof args[0] === 'function') {
    name = args[0].name

    // Function has been wrapped by us, use original function name
    if (name === 'opbeatFunctionWrapper' && args[0].original) {
      name = args[0].original.name
    }
  }

  if (typeof args[1] === 'object') {
    scope = args[1].$scope
  }

  return {
    scope: scope,
    name: name
  }
}

module.exports = function ($provide, transactionService) {
  $provide.decorator('$controller', ['$delegate', '$injector', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var controllerInfo = getControllerInfoFromArgs(args)

      if (controllerInfo.name) {
        var traceName = '$controller.' + controllerInfo.name
        var traceType = 'app.$controller'
        var trace = transactionService.startTrace(traceName, traceType, {enableStackFrames: false})
        var result

        try {
          result = $delegate.apply(this, arguments)
        } finally {
          if (!utils.isUndefined(trace)) {
            trace.end()
          }
        }
      } else {
        result = $delegate.apply(this, arguments)
      }

      return result
    }
  }])
}
