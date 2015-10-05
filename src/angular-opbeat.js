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

var instrumentMethod = function (module, fn, transaction, type, prefix) {
  var ref = module[fn]
  var name = prefix ? prefix + fn : fn

  return module[fn] = wrap(module[fn], function () {
    ref.trace = transaction.startTrace(name, type)
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

  $provide.decorator('$http', function ($delegate, $rootScope, $location) {
    var wrapper = function () {
      return $delegate.apply($delegate, arguments)
    }

    Object.keys($delegate).filter(function (key) {
      return (typeof $delegate[key] === 'function')
    }).forEach(function (key) {
      wrapper[key] = function () {
        var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]
        var fn = instrumentMethod($delegate, key, transaction, 'http', '$http.')
        return fn.apply($delegate, arguments)
      }
    })

    return wrapper
  })

  $provide.decorator('$controller', function ($delegate, $location, $rootScope) {
    $rootScope._opbeatTransactions = {}

    console.log('$rootScope._opbeatTransactions', $rootScope._opbeatTransactions)

    $rootScope.$on('$routeChangeStart', function (e, current, previous, rejection) {
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      if (!transaction) {
        transaction = $rootScope._opbeatTransactions[$location.absUrl()] = Opbeat.startTransaction($location.absUrl(), 'ext.controller')
      }

      console.log('scope', $rootScope._opbeatTransactions[$location.absUrl()])
    })

    return function () {
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]

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
          // Instrument scope functions
          Object.keys(controllerScope).forEach(function (property) {
            var ref = controllerScope[property]
            if (typeof ref === 'function') {
              instrumentMethod(controllerScope, property, transaction, 'scope')
            }
          })

          controllerScope.$on('$destroy', function () {
            console.log('opbeat.angular.controller.destroy')
          })

          controllerScope.$on('$viewContentLoaded', function (event) {
            console.log('opbeat.angular.controller.$viewContentLoaded')

            if (controllerScope._opbeatTransaction) {
            }
          })

        }
      }

      var result = $delegate.apply(this, args)

      if (className) {
        if (transaction) {
          transaction.end()
          $rootScope._opbeatTransactions[$location.absUrl()] = null
        // TODO: Unwrap methods
        }

        console.log('opbeat.decorator.controller.end')
      }

      return result

    }
  })

}

angular.module('ngOpbeat', [])
  .provider('$opbeat', ngOpbeatProvider)
  .config(['$provide', $opbeatHandlerProvider])

angular.module('angular-opbeat', ['ngOpbeat'])
