var opbeat = require('../opbeat')

function NgOpbeatProvider (logger) {
  this.config = function config (properties) {
    opbeat.config(properties)
    if (properties.debug === true) {
      logger.setLevel('debug', false)
    }
  }

  this.install = function install () {
    opbeat.install()
  }

  this.version = '%%VERSION%%'

  this.$get = [
    function () {
      return {
        getConfig: function config () {
          return opbeat.config()
        },
        captureException: function captureException (exception, cause) {
          opbeat.captureException(exception, cause)
        },

        setUserContext: function setUser (user) {
          opbeat.setUserContext(user)
        },

        setExtraContext: function setExtraContext (data) {
          opbeat.setExtraContext(data)
        }
      }
    }
  ]
}

function patchExceptionHandler ($provide) {
  $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
    return function $ExceptionHandler (exception, cause) {
      $opbeat.captureException(exception)
      return $delegate(exception, cause)
    }
  }])
}

var patchHttp = require('./httpPatch')
var patchController = require('./controllerPatch')
var patchCompile = require('./compilePatch')
var patchRootScope = require('./rootScopePatch')

function patchAll ($provide, transactionService) {
  patchExceptionHandler($provide)
  patchHttp($provide, transactionService)
  patchController($provide, transactionService)
  patchCompile($provide, transactionService)
  patchRootScope($provide, transactionService)

  var patchDirectives = require('./directivesPatch')
  patchDirectives($provide, transactionService)
}

function initialize (transactionService, logger, config, zoneService) {
  function moduleRun ($rootScope) {
    if (!opbeat.isPlatformSupport()) {
      return
    }
    // onRouteChangeStart
    function onRouteChangeStart (event, current) {
      if (!config.get('performance.enable')) {
        logger.debug('Performance monitoring is disable')
        return
      }
      logger.debug('Route change started')
      var transactionName
      if (current.$$route) { // ngRoute
        transactionName = current.$$route.originalPath
      } else { // UI Router
        transactionName = current.name
      }
      if (transactionName === '' || typeof transactionName === 'undefined') {
        transactionName = '/'
      }

      transactionService.startTransaction(transactionName, 'transaction')
    }

    // ng-router
    $rootScope.$on('$routeChangeStart', onRouteChangeStart)

    // ui-router
    $rootScope.$on('$stateChangeStart', onRouteChangeStart)
  }

  function moduleConfig ($provide) {
    if (!opbeat.isPlatformSupport()) {
      return
    }
    patchAll($provide, transactionService)
  }

  window.angular.module('ngOpbeat', [])
    .provider('$opbeat', new NgOpbeatProvider(logger))
    .config(['$provide', moduleConfig])
    .run(['$rootScope', moduleRun])
  window.angular.module('opbeat-angular', ['ngOpbeat'])
}

module.exports = initialize
