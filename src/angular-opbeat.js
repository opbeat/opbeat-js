var Opbeat = require('./opbeat')
var TraceBuffer = require('./instrumentation/traceBuffer')

var utils = require('./instrumentation/utils')
var logger = require('./lib/logger')

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

  // Before controller intialize transcation
  var traceBuffer = new TraceBuffer('beforeControllerTransaction')

  // Route controller Instrumentation
  $provide.decorator('$controller', function ($delegate, $location, $rootScope) {
    $rootScope._opbeatTransactions = {}

    var onRouteChange = function(e, current) {
      var routeControllerTarget = current.controller
      logger.log('opbeat.decorator.controller.onRouteChange')
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      if (!transaction) {
        transaction = Opbeat.startTransaction('app.angular.controller.' + routeControllerTarget, 'transaction')
        transaction.metadata.controllerName = routeControllerTarget
        $rootScope._opbeatTransactions[$location.absUrl()] = transaction

        // Update transaction reference in traceBuffer
        traceBuffer.setTransactionRef(transaction);
      }

    }

    $rootScope.$on('$routeChangeStart', onRouteChange) // ng-router
    $rootScope.$on('$stateChangeSuccess', onRouteChange) // ui-router

    return function () {
      logger.log('opbeat.decorator.controller.ctor')

      var args = Array.prototype.slice.call(arguments)
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      var controllerInfo = utils.getControllerInfoFromArgs(args)
      var controllerName = controllerInfo.name
      var controllerScope = controllerInfo.scope
      var isRouteController = controllerName && transaction && transaction.metadata.controllerName === controllerName

      var result = $delegate.apply(this, args)

      if (isRouteController && controllerScope) {
        logger.log('opbeat.angular.controller', controllerName)

        // Instrument controller scope functions
        utils.getObjectFunctions(controllerScope).forEach(function (funcScope) {
          utils.instrumentMethod(funcScope.scope, funcScope.property, transaction, 'app.angular.controller', {
            override: true
          })
        })

        controllerScope.$on('$destroy', function () {
          logger.log('opbeat.angular.controller.destroy')
        })

        controllerScope.$on('$viewContentLoaded', function (event) {

          logger.log('opbeat.angular.controller.$viewContentLoaded')

          // Transaction clean up
          transaction.end()
          $rootScope._opbeatTransactions[$location.absUrl()] = null

          if (controllerScope) {
            // Uninstrument controller scope functions
            utils.getObjectFunctions(controllerScope).forEach(function (funcScope) {
              utils.uninstrumentMethod(funcScope.scope, funcScope.property)
            })
          }

        })
      }

      logger.log('opbeat.decorator.controller.end')
      return result
    }
  })

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

  // Template Compile Instrumentation
  $provide.decorator('$compile', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'template.angular.$compile',
      prefix: '$compile'
    })
  })

  // Template Request Instrumentation
  $provide.decorator('$templateRequest', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'template.angular.request',
      prefix: '$templateRequest',
      signatureFormatter: function(key, args) {
        var text = ['$templateRequest', args[0]]
        return text.join(' ')
      }
    })
  })

  // HTTP Instrumentation
  $provide.decorator('$http', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'ext.http.request',
      prefix: 'angular.$http',
      signatureFormatter: function(key, args) {
        var text = []
        // $http used directly
        if(key && args) {
          text = ['$http', key.toUpperCase(), args[0]]
        } else if(!key && typeof args === 'object') {
          // $http used from $resource
          var req = args[0]
          text = ['$http', req.method, req.url]
        }

        return text.join(' ')
      }
    })
  })

  // Core directive instrumentation
  var coreDirectives = ['ngBind', 'ngClass', 'ngModel', 'ngIf', 'ngInclude', 'ngRepeat', 'ngSrc', 'ngStyle', 'ngSwitch', 'ngTransclude']
  coreDirectives.forEach(function(name) {
    var directiveName = name + 'Directive'
    $provide.decorator(directiveName, function ($delegate, $injector) {
      utils.instrumentObject($delegate[0], $injector, {
        type: 'template.angular.directive',
        prefix: directiveName
      })
      return $delegate
    })
  })

  // ngResource instrumentation
  $provide.decorator('$resource', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var result = $delegate.apply(this, args)
      utils.instrumentObject(result, $injector, {
        type: 'ext.$resource',
        prefix: '$resource',
        signatureFormatter: function(key, args) {
          var text = ['$resource', key.toUpperCase(), args[0]]
          return text.join(' ')
        }
      })
      return result
    };
  })

  // $httpBackend instrumentation
  $provide.decorator('$httpBackend', function ($delegate, $injector) {

    var $rootScope = $injector.get('$rootScope')
    var $location = $injector.get('$location')

    return function () {
      var args = Array.prototype.slice.call(arguments)
      var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]

      var result = utils.instrumentMethodWithCallback($delegate, '$httpBackend', transaction, 'app.httpBackend', {
        prefix: '$httpBackend',
        callbackIndex: 3,
        signatureFormatter: function(key, args) {
          var text = ['$httpBackend', args[0].toUpperCase(), args[1]]
          return text.join(' ')
        }
      }).apply(this, args)

      return result
    };
  })

  // $cacheFactory instrumentation
  $provide.decorator('$cacheFactory', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var cacheName = args[0] + 'Cache'
      var result = $delegate.apply(this, args)
      utils.instrumentObject(result, $injector, {
        type: 'cache.' + cacheName,
        prefix: cacheName,
        transaction: traceBuffer,
        signatureFormatter: function(key, args) {
          var text = ['$cacheFactory', key.toUpperCase(), args[0]]
          return text.join(' ')
        }
      })
      return result
    };
  })

}

window.angular.module('ngOpbeat', [])
  .provider('$opbeat', ngOpbeatProvider)
  .config(['$provide', $opbeatErrorProvider])
  .config(['$provide', $opbeatInstrumentationProvider])

window.angular.module('angular-opbeat', ['ngOpbeat'])
