var Opbeat = require('./opbeat')

var wrap = function (fn, before, after) {
  return function opbeatInstrumentationWrapper () {
    var args = Array.prototype.slice.call(arguments)

    before.apply(this, args)

    var result = fn.apply(this, args)

    // Promise handling
    if (result && typeof result.then === 'function') {
      result.then(function () {
        after.apply(this, args)
      }.bind(this))
    } else {
      after.apply(this, args)
    }

    return result
  }
}

var instrumentMethod = function (module, fn, transaction, type, options) {

  options = options || {}
  var ref
  var name = options.prefix ? options.prefix + '.' + fn : fn

  if (options.instrumentModule) {
    ref = module
  } else {
    ref = module[fn]
  }

  ref.original = ref

  var wrappedMethod = wrap(ref, function instrumentMethodBefore () {
    ref.trace = transaction.startTrace(name, type)
  }, function instrumentMethodAfter () {
    if (ref.trace) {
      ref.trace.end()
    }
  })

  if (options.override) {
    module[fn] = wrappedMethod
  }

  return wrappedMethod

}

var instrumentModule = function (module, $injector, options) {
  options = options || {}

  var $rootScope = $injector.get('$rootScope')
  var $location = $injector.get('$location')

  console.log('instrumentModule', module.name)
  var wrapper = function () {
    var fn = module
    var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]
    if (transaction) {
      fn = instrumentMethod(module, 'root', transaction, options.type, {
        prefix: options.prefix,
        override: false,
        instrumentModule: true
      })
    }

    return fn.apply(module, arguments)
  }

  // Instrument static functions
  getScopeFunctions(module).forEach(function (funcScope) {
    console.log('funcScope', funcScope)
    wrapper[funcScope.property] = function () {
      var fn = funcScope.ref
      var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]
      if (transaction) {
        fn = instrumentMethod(module, funcScope.property, transaction, options.type, {
          prefix: options.prefix,
          override: true
        })
      }

      return fn.apply(module, arguments)
    }
  })

  return wrapper
}

var uninstrumentMethod = function (module, fn) {
  var ref = module[fn]
  if (ref.original) {
    module[fn] = ref.original
    if (module[fn].trace) {
      module[fn].trace = null
    }
  }
}

var getScopeFunctions = function (scope) {
  return Object.keys(scope).filter(function (key) {
    return typeof scope[key] === 'function'
  }).map(function (property) {
    var ref = scope[property]
    return {
      scope: scope,
      property: property,
      ref: ref
    }
  })
}

function getControllerInfoFromArgs (args) {
  var scope, name

  if (typeof args[0] === 'string') {
    name = args[0]
  } else if (typeof args[0] === 'function') {
    name = args[0].name
  }

  if (typeof args[1] === 'object') {
    scope = args[1].$scope
  }

  return {
    scope: scope,
    name: name
  }
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

function $opbeatErrorProvider ($provide) {
  $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
    return function $ExceptionHandler (exception, cause) {
      $opbeat.captureException(exception)
      return $delegate(exception, cause)
    }
  }])
}

function $opbeatInstrumentationProvider ($provide) {

  // Route controller Instrumentation
  $provide.decorator('$controller', function ($delegate, $location, $rootScope) {
    $rootScope._opbeatTransactions = {}

    $rootScope.$on('$routeChangeStart', function (e, current, previous, rejection) {
      var routeControllerTarget = current.controller
      console.log('opbeat.decorator.controller.routeChangeStart')
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      if (!transaction) {
        transaction = Opbeat.startTransaction('angular.controller.' + routeControllerTarget, 'ext.controller')
        transaction.metadata.controllerName = routeControllerTarget

        $rootScope._opbeatTransactions[$location.absUrl()] = transaction
      }
    })

    return function () {
      console.log('opbeat.decorator.controller.ctor')

      var args = Array.prototype.slice.call(arguments)

      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      var controllerInfo = getControllerInfoFromArgs(args)
      var controllerName = controllerInfo.name
      var controllerScope = controllerInfo.scope

      var isRouteController = controllerName && transaction && transaction.metadata.controllerName === controllerName

      var result = $delegate.apply(this, args)

      if (isRouteController) {

        console.log('opbeat.angular.controller', controllerName)

        if (controllerScope) {

          // // Instrument scope functions
          getScopeFunctions(controllerScope).forEach(function (funcScope) {
            instrumentMethod(funcScope.scope, funcScope.property, transaction, 'app.controller', {
              override: true
            })
          })

          controllerScope.$on('$destroy', function () {
            console.log('opbeat.angular.controller.destroy')
          })

          controllerScope.$on('$viewContentLoaded', function (event) {

            // Transaction clean up
            transaction.end()
            $rootScope._opbeatTransactions[$location.absUrl()] = null

            if (controllerScope) {
              // Uninstrument scope functions
              getScopeFunctions(controllerScope).forEach(function (funcScope) {
                uninstrumentMethod(funcScope.scope, funcScope.property)
              })
            }

            console.log('opbeat.angular.controller.$viewContentLoaded')
          })

        }
      }

      console.log('opbeat.decorator.controller.end')
      return result
    }
  })

  // Controller Instrumentation
  $provide.decorator('$controller', function ($delegate, $injector) {

    return function () {
      var $rootScope = $injector.get('$rootScope')
      var $location = $injector.get('$location')

      var args = Array.prototype.slice.call(arguments)
      var controllerInfo = getControllerInfoFromArgs(args)
      var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]

      if (controllerInfo.name) {
        if (transaction && transaction.metadata.controllerName !== controllerInfo.name) {
          return instrumentModule($delegate, $injector, {
            type: 'ext.controller',
            prefix: 'angular.controller.' + controllerInfo.name
          }).apply(this, arguments)
        }
      }

      return $delegate.apply(this, arguments)
    }

  })

  // Template Compile Instrumentation
  $provide.decorator('$compile', function ($delegate, $injector) {
    return instrumentModule($delegate, $injector, {
      type: 'template.$compile',
      prefix: '$compile'
    })
  })

  // Template Request Instrumentation
  $provide.decorator('$templateRequest', function ($delegate, $injector) {
    return instrumentModule($delegate, $injector, {
      type: 'template.request',
      prefix: '$templateRequest'
    })
  })

  // HTTP Instrumentation
  $provide.decorator('$http', function ($delegate, $injector) {
    return instrumentModule($delegate, $injector, {
      type: 'http.request',
      prefix: '$http'
    })
  })

}

window.angular.module('ngOpbeat', [])
  .provider('$opbeat', ngOpbeatProvider)
  .config(['$provide', $opbeatErrorProvider])
  .config(['$provide', $opbeatInstrumentationProvider])

window.angular.module('angular-opbeat', ['ngOpbeat'])
