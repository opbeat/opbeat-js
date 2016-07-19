function NgOpbeatProvider (logger, configService, exceptionHandler) {
  this.config = function config (properties) {
    if (properties) {
      configService.setConfig(properties)
    }
  }

  this.version = '%%VERSION%%'

  this.install = function install () {
    logger.warn('$opbeatProvider.install is deprecated!')
  }

  this.$get = [
    function () {
      return {
        getConfig: function config () {
          return configService
        },
        captureException: function captureException (exception, options) {
          if (!(exception instanceof Error)) {
            logger.warn("Can't capture exception. Passed exception needs to be an instanceof Error")
            return
          }

          // TraceKit.report will re-raise any exception passed to it,
          // which means you have to wrap it in try/catch. Instead, we
          // can wrap it here and only re-raise if TraceKit.report
          // raises an exception different from the one we asked to
          // report on.

          exceptionHandler.processError(exception, options)
        },

        setUserContext: function setUser (user) {
          configService.set('context.user', user)
        },

        setExtraContext: function setExtraContext (data) {
          configService.set('context.extra', data)
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

var patchController = require('./controllerPatch')
var patchCompile = require('./compilePatch')
var patchRootScope = require('./rootScopePatch')

function patchAll ($provide, transactionService) {
  patchExceptionHandler($provide)
  patchController($provide, transactionService)
  patchCompile($provide, transactionService)
  patchRootScope($provide, transactionService)

  var patchDirectives = require('./directivesPatch')
  patchDirectives($provide, transactionService)
}

function initialize (transactionService, logger, configService, zoneService, exceptionHandler) {
  function moduleRun ($rootScope) {
    if (!configService.isPlatformSupport()) {
      return
    }
    configService.set('isInstalled', true)

    // onRouteChangeStart
    function onRouteChangeStart (event, current) {
      if (!configService.get('performance.enable')) {
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
    if (!configService.isPlatformSupport()) {
      return
    }
    patchAll($provide, transactionService)
  }

  window.angular.module('ngOpbeat', [])
    .provider('$opbeat', new NgOpbeatProvider(logger, configService, exceptionHandler))
    .config(['$provide', moduleConfig])
    .run(['$rootScope', moduleRun])
  window.angular.module('opbeat-angular', ['ngOpbeat'])
}

module.exports = initialize
