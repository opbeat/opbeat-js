var Opbeat = require('./opbeat')

var wrap = function (fn, before, after) {
  return function opbeatInstrumentationWrapper () {
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
  ref.original = module[fn]

  return module[fn] = wrap(module[fn], function () {
    ref.trace = transaction.startTrace(name, type)

  }, function () {
    if (ref.trace) {
      ref.trace.end()
    }
  })
}

var uninstrumentMethod =  function(module, fn) {

  var ref = module[fn]
  if(ref.original) {
    module[fn] = ref.original
  }

}

var getScopeFunctions = function(scope) {

  return Object.keys(scope).map(function (property) {
    var ref = scope[property]
    if (typeof ref === 'function') {
      return {
        scope: scope,
        property: property,
        ref: ref
      }
    } else {
      return null;
    }
  }).filter(function(item) {
    return item !== null
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

function $opbeatErrorProvider ($provide ) {
  $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
    return function $ExceptionHandler (exception, cause) {
      $opbeat.captureException(exception)
      return $delegate(exception, cause)
    }
  }])
}

function $opbeatInstrumentationProvider ($provide ) {
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

    $rootScope.$on('$routeChangeStart', function (e, current, previous, rejection) {
      var routeControllerTarget = current.controller;
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      if (!transaction) {
        transaction = Opbeat.startTransaction('angular.controller.'+routeControllerTarget, 'ext.controller')
        transaction.metadata.controllerName = routeControllerTarget

        $rootScope._opbeatTransactions[$location.absUrl()] = transaction
      }
    })

    return function () {
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]

      var args = Array.prototype.slice.call(arguments)
      var controllerName
      var controllerScope

      if (typeof args[0] === 'string') {
        controllerName = args[0]
      } else if (typeof args[0] === 'function') {
        controllerName = args[0].name
      }

      if (typeof args[1] === 'object') {
        controllerScope = args[1].$scope
      }

      if (controllerName && transaction && transaction.metadata.controllerName === controllerName) {
        console.log('opbeat.angular.controller', controllerName, controllerScope)

        if (controllerScope) {

          // Instrument scope functions
          getScopeFunctions(controllerScope).forEach(function (funcScope) {
            instrumentMethod(funcScope.scope, funcScope.property, transaction, 'app.controller')
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

      if (controllerName && transaction && transaction.metadata.controllerName === controllerName) {

        // Transaction clean up
        transaction.end()
        $rootScope._opbeatTransactions[$location.absUrl()] = null

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
  .config(['$provide', $opbeatErrorProvider])
  .config(['$provide', $opbeatInstrumentationProvider])

angular.module('angular-opbeat', ['ngOpbeat'])
