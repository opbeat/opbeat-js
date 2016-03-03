var TransactionService = require('/transaction/transaction_service.js')

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
function patchAll ($provide, transactionService) {
  patchExceptionHandler($provide)
  patchHttp($provide, transactionService)
  patchController($provide, transactionService)
  patchCompile($provide, transactionService)
  patchTemplateRequest($provide, transactionService)
}

var logger = require('loglevel')

function initialize () {
  var config = Opbeat.config()
  var transactionOptions = {
    config: config
  }

  logger.setLevel('debug', false)

  var transactionService = new TransactionService(window.zone, logger, transactionOptions)

  function moduleRun ($rootScope) {
    function onRouteChangeStart (event, current) {
      var transactionName
      if (current.$$route) { // ngRoute
        transactionName = current.$$route.originalPath
      } else if (current.url) { // UI Router
        transactionName = current.name // Use state name over URL
      }

      transactionService.startTransaction(transactionName, 'transaction', { config: config })
    }
    $rootScope.$on('$routeChangeStart', onRouteChangeStart) // ng-router
    $rootScope.$on('$stateChangeSuccess', onRouteChangeStart) // ui-router
  }

  var opbeatBackend = new OpbeatBackend(transport, logger)

  function flushTransactions () {
    transactionService.clearTransactions()
  }
  setInterval(function () {
    var transactions = transactionService.getTransactions()

    if (transactions.length === 0) {
      return
    }
    logger.debug('Sending Transactions to opbeat.', transactions.length)
    // todo: if transactions are already being sent, should check
    opbeatBackend.sendTransactions(transactions)
      .then(flushTransactions, flushTransactions)
  }, 5000)

  window.angular.bootstrap = transactionService.zone.bind(window.angular.bootstrap)

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
