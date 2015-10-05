var Opbeat = require('./opbeat')

var wrap = function (fn, before, after) {
  return function () {
    var args = Array.prototype.slice.call(arguments)

    before.apply(this, args)
    var result = fn.apply(this, args)
    after.apply(this, args)

    return result
  }
}

var instrumentMethod = function (module, fn, transaction) {
  var ref = module[fn]
  var name = fn

  return module[fn] = wrap(module[fn], function () {
    ref.trace = transaction.startTrace(name)
  }, function () {
    if (ref.trace) {
      ref.trace.end()
    }
  })

}

function ngOpbeatProvider () {
  this.config = function config (properties) {
    Opbeat.config(properties)
  }

  this.install = function install () {
    Opbeat.install()
  }

  this.$get = [function () {
    return {
      captureException: function captureException (exception, cause) {
        Opbeat.captureException(exception, cause)
      },

      setUserContext: function setUser (user) {
        Opbeat.setUserContext(user)
      },

      setExtraContext: function setExtraContext (data) {
        Opbeat.setExtraContext(data)
      }
    }
  }]
}

function $opbeatHandlerProvider ($provide ) {
  // $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
  //   return function $ExceptionHandler (exception, cause) {
  //     $opbeat.captureException(exception)
  //     return $delegate(exception, cause)
  //   }
  // }])

  $provide.decorator('$controller', function ($delegate, $location, $routeParams) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var className

      if (typeof args[0] === 'string') {
        className = args[0]
      } else if (typeof args[0] === 'function') {
        className = args[0].name
      }
      var controllerScope

      if (typeof args[1] === 'object') {
        controllerScope = args[1].$scope
      }

      if (className) {
        console.log('opbeat.angular.controller', className, $location.absUrl(), controllerScope)

        if (controllerScope) {
          controllerScope._opbeatTransaction = Opbeat.startTransaction(className, 'ext.controller')

          // Instrument scope functions
          Object.keys(controllerScope).forEach(function (property) {
            var ref = controllerScope[property]
            if (typeof ref === 'function') {
              instrumentMethod(controllerScope, property, controllerScope._opbeatTransaction)
            }
          })

          controllerScope.$on('$destroy', function () {
            console.log('opbeat.angular.controller.destroy')
          })

          controllerScope.$on('$viewContentLoaded', function (event) {
            console.log('opbeat.angular.controller.$viewContentLoaded')

            if (controllerScope._opbeatTransaction) {
              controllerScope._opbeatTransaction.end()
            }
          })

        }
      }

      return $delegate.apply(this, args)

      if (className) {
        console.log('opbeat.decorator.controller.end')
      }

    }
  })

}

angular.module('ngOpbeat', [])
  .provider('$opbeat', ngOpbeatProvider)
  .config(['$provide', $opbeatHandlerProvider])

angular.module('angular-opbeat', ['ngOpbeat'])
