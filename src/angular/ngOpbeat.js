var Opbeat = require('../opbeat')

function NgOpbeatProvider (logger) {
  this.config = function config (properties) {
    Opbeat.config(properties)
    if (properties.debug === true) {
      logger.setLevel('debug', false)
    }
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
var patchTemplateRequest = require('./templateRequestPatch')
var patchRootScope = require('./rootScopePatch')
function patchAll ($provide, transactionService) {
  patchExceptionHandler($provide)
  patchHttp($provide, transactionService)
  patchController($provide, transactionService)
  patchCompile($provide, transactionService)
  patchTemplateRequest($provide, transactionService)
  patchRootScope($provide, transactionService)
}

function initialize (transactionService, logger) {
  var config = Opbeat.config()

  function moduleRun ($rootScope) {
    // onRouteChangeStart
    function onRouteChangeStart (event, current) {
      logger.debug('Route change started')
      var transactionName
      if (current.$$route) { // ngRoute
        transactionName = current.$$route.originalPath
      } else if (current.url) { // UI Router
        transactionName = current.name // Use state name over URL
      }
      if (transactionName === '') {
        transactionName = '/'
      }

      var transactionOptions = {'performance.enableStackFrames': config.get('performance.enableStackFrames')}
      var trId = transactionService.startGlobalTransaction(transactionName, 'transaction', transactionOptions)

      var ngRouterCancel = $rootScope.$on('$routeChangeSuccess', onRouteChangeSuccess)
      var uiRouterCancel = $rootScope.$on('$stateChangeSuccess', onRouteChangeSuccess)

      function onRouteChangeSuccess () {
        setTimeout(function () {
          logger.debug('Route change success')
          transactionService.endTransaction(trId)
          ngRouterCancel()
          uiRouterCancel()
        }, 0)
      }
    }

    // ng-router
    $rootScope.$on('$routeChangeStart', onRouteChangeStart)

    // ui-router
    $rootScope.$on('$stateChangeStart', onRouteChangeStart)
  }

  function moduleConfig ($provide) {
    patchAll($provide, transactionService)
  }

  window.angular.module('ngOpbeat', [])
    .provider('$opbeat', new NgOpbeatProvider(logger))
    .config(['$provide', moduleConfig])
    .run(['$rootScope', moduleRun])
  window.angular.module('angular-opbeat', ['ngOpbeat'])
}

module.exports = initialize
