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

  this.$get = [
    function () {
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
    }
  ]
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

    var onRouteChange = function (e, current) {
      var routeControllerTarget = current.controller
      logger.log('opbeat.decorator.controller.onRouteChange')
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      if (!transaction) {
        transaction = Opbeat.startTransaction('app.angular.controller.' + routeControllerTarget, 'transaction')
        transaction.metadata.controllerName = routeControllerTarget
        $rootScope._opbeatTransactions[$location.absUrl()] = transaction

        // Update transaction reference in traceBuffer
        traceBuffer.setTransactionRef(transaction)
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

  $provide.decorator('$controller', function ($delegate, $rootScope, $rootElement) {
    $rootScope._opbeatHasInstrumentedFactories = false;
    $rootScope._opbeatHasInstrumentedDirectives = false;

    var directivesInstrumentation = require('./angular/directives')($provide)

    // Factory instrumentation
    if(!$rootScope._opbeatHasInstrumentedFactories) {
      var factories = utils.resolveAngularDependenciesByType($rootElement, 'factory')
      require('./angular/factories')($provide).instrumentationAll(factories)
      $rootScope._opbeatHasInstrumentedFactories = true
    }

    // Custom directive instrumentation
    if(!$rootScope._opbeatHasInstrumentedDirectives) {
      var directives = utils.resolveAngularDependenciesByType($rootElement, 'directive')
      directivesInstrumentation.instrumentationAll(directives)
      $rootScope._opbeatHasInstrumentedDirectives = true
    }

    // Core directives instrumentation
    directivesInstrumentation.instrumentationCore();

    return $delegate
  })

  // Angular Core Instrumentation
  require('./angular/cacheFactory')($provide, traceBuffer)
  require('./angular/compile')($provide, traceBuffer)
  require('./angular/controller')($provide, traceBuffer)
  require('./angular/http')($provide, traceBuffer)
  require('./angular/httpBackend')($provide, traceBuffer)
  require('./angular/resource')($provide, traceBuffer)
  require('./angular/templateRequest')($provide, traceBuffer)

}

window.angular.module('ngOpbeat', [])
  .provider('$opbeat', ngOpbeatProvider)
  .config(['$provide', $opbeatErrorProvider])
  .config(['$provide', $opbeatInstrumentationProvider])

window.angular.module('angular-opbeat', ['ngOpbeat'])
