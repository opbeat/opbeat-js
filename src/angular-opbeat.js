var Opbeat = require('./opbeat')
var TraceBuffer = require('./instrumentation/traceBuffer')
var transactionStore = require('./instrumentation/transactionStore')

var utils = require('./instrumentation/utils')
var logger = require('./lib/logger')

function ngOpbeatProvider () {
  this.config = function config (properties) {
    Opbeat.config(properties)
  }

  this.install = function install () {
    Opbeat.install()
  }

  this.version = '%%VERSION%%'

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
  $provide.decorator('$controller', ['$delegate', '$location', '$rootScope', '$injector', function ($delegate, $location, $rootScope, $injector) {
    transactionStore.init($injector)

    var onRouteChange = function (e, current) {
      logger.log('opbeat.decorator.controller.onRouteChange', current)

      if (!config.get('isInstalled')) {
        logger.log('opbeat.instrumentation.onRouteChange.not.installed')
        return
      }

      if (!config.get('performance.enable')) {
        logger.log('- %c opbeat.instrumentation.disabled', 'color: #3360A3')
        return
      }

      var routeControllerName
      var routeController
      var transactionName

      // Detect controller
      if (current.controller) {
        routeController = current.controller
      } else if (current.views) {
        var keys = Object.keys(current.views)
        if (keys) {
          routeController = current.views[keys[0]].controller
        }
      }

      // Extract controller name
      if (typeof (routeController) === 'string') {
        routeControllerName = routeController
      }

      if (!routeControllerName) {
        logger.log('%c opbeat.decorator.controller.onRouteChange.error.routeControllerName.missing', 'background-color: #ffff00', current)
        return
      }

      if (current.$$route) { // ngRoute
        transactionName = current.$$route.originalPath
      } else if (current.url) { // UI Router
        transactionName = current.name // Use state name over URL
      }

      if (!transactionName) {
        logger.log('%c opbeat.decorator.controller.onRouteChange.error.transactionName.missing', 'background-color: #ffff00', current)
        return
      }

      var transaction = Opbeat.startTransaction(transactionName, 'transaction', transactionOptions)
      transaction.metadata.controllerName = routeControllerName

      // Update transaction store
      transactionStore.pushToUrl(window.location.href, transaction)

      // Update transaction reference in traceBuffer
      traceBuffer.setTransactionReference(transaction)

      // Lock traceBuffer, as we only want to migrate the initial traces to the first transaction
      traceBuffer.lock()

      // Add finished traces to transaction and flush buffer
      transaction.addEndedTraces(traceBuffer.traces)
      traceBuffer.flush()
    }

    $rootScope.$on('$routeChangeSuccess', onRouteChange) // ng-router
    $rootScope.$on('$stateChangeSuccess', onRouteChange) // ui-router

    return function () {
      logger.log('opbeat.decorator.controller.ctor')

      var args = Array.prototype.slice.call(arguments)
      var result = $delegate.apply(this, args)

      if (!config.get('performance.enable')) {
        logger.log('- %c opbeat.instrumentation.disabled', 'color: #3360A3')
        return result
      }

      var url = window.location.href
      var transaction = transactionStore.getRecentByUrl(url)

      var controllerInfo = utils.getControllerInfoFromArgs(args)
      var controllerName = controllerInfo.name
      var controllerScope = controllerInfo.scope
      var isRouteController = controllerName && transaction && transaction.metadata.controllerName === controllerName

      var onViewFinished = function (argument) {
        logger.log('opbeat.angular.controller.$onViewFinished')
        transactionStore.getAllByUrl(url).forEach(function (trans) {
          transaction.end()
        })
        transactionStore.clearByUrl(url)
      }

      if (isRouteController && controllerScope) {
        logger.log('opbeat.angular.controller', controllerName)
        controllerScope.$on('$ionicView.enter', onViewFinished)
        controllerScope.$on('$viewContentLoaded', onViewFinished)
      }

      logger.log('opbeat.decorator.controller.end')
      return result
    }
  }])

  $provide.decorator('$controller', ['$delegate', '$rootScope', '$rootElement', function ($delegate, $rootScope, $rootElement) {
    $rootScope._opbeatHasInstrumentedFactories = false
    $rootScope._opbeatHasInstrumentedDirectives = false

    var directivesInstrumentation = require('./instrumentation/angular/directives')($provide, traceBuffer)

    // Factory instrumentation
    if (!$rootScope._opbeatHasInstrumentedFactories) {
      var factories = utils.resolveAngularDependenciesByType($rootElement, 'factory')
      require('./instrumentation/angular/factories')($provide, traceBuffer).instrumentAll(factories)
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
