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
        getConfig: function config () {
          return Opbeat.config()
        },
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

function $opbeatInstrumentationProvider ($provide, $opbeat) {

  var config = $opbeat.$get[0]().getConfig()
  var transactionOptions = {
    config: config
  }

  // Before controller intialize transcation
  var traceBuffer = new TraceBuffer('beforeControllerTransaction', transactionOptions)

  // Route controller Instrumentation
  $provide.decorator('$controller', ['$delegate', '$location', '$rootScope', function ($delegate, $location, $rootScope) {
    $rootScope._opbeatTransactions = {}

    var onRouteChange = function (e, current) {
      var routeControllerTarget = current.controller
      logger.log('opbeat.decorator.controller.onRouteChange')
      var transaction = $rootScope._opbeatTransactions[$location.absUrl()]
      if (!transaction) {
        transaction = Opbeat.startTransaction('app.angular.controller.' + routeControllerTarget, 'transaction', transactionOptions)

        transaction.metadata.controllerName = routeControllerTarget
        $rootScope._opbeatTransactions[$location.absUrl()] = transaction

        // Update transaction reference in traceBuffer
        traceBuffer.setTransactionReference(transaction)

        // Lock traceBuffer, as we only want to migrate the initial traces to the first transaction
        traceBuffer.lock()
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
            override: true,
            config: config
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
        })
      }

      logger.log('opbeat.decorator.controller.end')
      return result
    }
  }])

  $provide.decorator('$controller', ['$delegate', '$rootScope', '$rootElement', function ($delegate, $rootScope, $rootElement) {
    $rootScope._opbeatHasInstrumentedFactories = false
    $rootScope._opbeatHasInstrumentedDirectives = false

    var directivesInstrumentation = require('./instrumentation/angular/directives')($provide)

    // Factory instrumentation
    if (!$rootScope._opbeatHasInstrumentedFactories) {
      var factories = utils.resolveAngularDependenciesByType($rootElement, 'factory')
      require('./instrumentation/angular/factories')($provide).instrumentAll(factories)
      $rootScope._opbeatHasInstrumentedFactories = true
    }

    if (!$rootScope._opbeatHasInstrumentedDirectives) {
      // Custom directive instrumentation
      var directives = utils.resolveAngularDependenciesByType($rootElement, 'directive')
      directivesInstrumentation.instrumentAll(directives)
      $rootScope._opbeatHasInstrumentedDirectives = true

      // Core directives instrumentation
      directivesInstrumentation.instrumentCore()
    }

    return $delegate
  }])

  // Angular Core Instrumentation
  require('./instrumentation/angular/cacheFactory')($provide, traceBuffer)
  require('./instrumentation/angular/compile')($provide, traceBuffer)
  require('./instrumentation/angular/controller')($provide, traceBuffer)
  require('./instrumentation/angular/http')($provide, traceBuffer)
  require('./instrumentation/angular/httpBackend')($provide, traceBuffer)
  require('./instrumentation/angular/resource')($provide, traceBuffer)
  require('./instrumentation/angular/templateRequest')($provide, traceBuffer)
}

window.angular.module('ngOpbeat', [])
  .provider('$opbeat', ngOpbeatProvider)
  .config(['$provide', '$opbeatProvider', $opbeatErrorProvider])
  .config(['$provide', '$opbeatProvider', $opbeatInstrumentationProvider])

window.angular.module('angular-opbeat', ['ngOpbeat'])
