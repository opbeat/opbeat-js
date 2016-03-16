var TransactionService = require('../transaction/transaction_service')

var OpbeatBackend = require('../backend/opbeat_backend')
var transport = require('../lib/transport')

var Opbeat = require('../opbeat')

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

var logger = require('loglevel')

function initialize () {
  var config = Opbeat.config()
  var transactionOptions = {'performance.enableStackFrames': config.get('performance.enableStackFrames')}

  logger.setLevel('debug', false)

  var transactionService = new TransactionService(logger, transactionOptions)

  function moduleRun ($rootScope) {
    function onRouteChangeStart (event, current) {
      logger.debug('Route change started')
      var transactionName
      if (current.$$route) { // ngRoute
        transactionName = current.$$route.originalPath
      } else if (current.url) { // UI Router
        transactionName = current.name // Use state name over URL
      }
      if (transactionName === '') {
        transactionName = 'Main page load'
      }
      transactionService.startTransaction(transactionName, 'transaction', transactionOptions)
    }

    function onRouteChangeSuccess () {
      setTimeout(function () {
        logger.debug('Route change success')
        transactionService.endCurrentTransaction()
      }, 0)
    }

    // ng-router
    $rootScope.$on('$routeChangeStart', onRouteChangeStart)
    $rootScope.$on('$routeChangeSuccess', onRouteChangeSuccess)

    // ui-router
    $rootScope.$on('$stateChangeStart', onRouteChangeStart)
    $rootScope.$on('$stateChangeSuccess', onRouteChangeSuccess)
  }

  var opbeatBackend = new OpbeatBackend(transport, logger)

  setInterval(function () {
    var transactions = transactionService.getTransactions()

    if (transactions.length === 0) {
      return
    }
    logger.debug('Sending Transactions to opbeat.', transactions.length)
    // todo: if transactions are already being sent, should check
    opbeatBackend.sendTransactions(transactions)
    transactionService.clearTransactions()
  }, 5000)

  // Ignoring zonejs for now
  // var useZoneJS = false
  // if (useZoneJS) {
  //   var ZoneService = require('../transaction/zone_service')
  //   var zoneService = new ZoneService(window.zone, transactionService, logger)
  //   window.angular.bootstrap = zoneService.zone.bind(window.angular.bootstrap)
  // }

  function moduleConfig ($provide) {
    patchAll($provide, transactionService)
  }

  window.angular.module('ngOpbeat', [])
    .provider('$opbeat', ngOpbeatProvider)
    .config(['$provide', moduleConfig])
    .run(['$rootScope', moduleRun])
  window.angular.module('angular-opbeat', ['ngOpbeat'])
}

initialize()
