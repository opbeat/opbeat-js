var Config = require('/lib/config')
var TransactionService = require('/transaction/transaction_service.js')

var config = {
  config: {isInstalled: true, debug: true},
  init: function () { this.setConfig({isInstalled: true, debug: true}) },
  '@runtimeGlobal': true
}

Object.setPrototypeOf(config, Config)

config.init()
var logger = require('loglevel')
logger.setLevel('debug', false)
var transactionService = new TransactionService(zone, logger)

function $animatePatch ($provide, traceBuffer) {
  $provide.decorator('$animate', ['$delegate', function ($delegate) {
    var _enter = $delegate.enter
    $delegate.enter = function () {
      console.log('animation started')
      var t = traceBuffer.startTrace('$animate.enter', '$animate')
      var result = _enter.apply(this, arguments)
      function animationEnded () {
        console.log('animation ended')
        t.end()
      }
      result.then(animationEnded, animationEnded)
      return result
    }
    return $delegate
  }])

// $provide.decorator('$animate', ['$delegate', '$injector', function ($delegate, $injector) {
//   return utils.instrumentModule($delegate, $injector, {
//     type: '$animate',
//     prefix: '$animate',
//     instrumentConstructor: false,
//     traceBuffer: traceBuffer,
//     signatureFormatter: function (key, args) {
//       var text = ['$animate']
//       text.push(key)
//       // if (args.length) {
//       //   if (args[0] !== null && typeof args[0] === 'object') {
//       //     if (!args[0].method) {
//       //       args[0].method = 'get'
//       //     }
//       //     text = ['$http', args[0].method.toUpperCase(), args[0].url]
//       //   } else if (typeof args[0] === 'string') {
//       //     text = ['$http', args[0]]
//       //   }
//       // }
//       return text.join(' ')
//     }
//   })
// }])
}
function patch ($provide) {
  $animatePatch($provide, transactionService)
}

function appRun ($rootScope) {
  function onRouteChange () {
    var tr = transactionService.startTransaction('transaction', 'transaction', { config: config })
  // tr.end()
  // setTimeout(function () {
  //   tr.end()
  // }, 100)
  }
  $rootScope.$on('$routeChangeStart', onRouteChange) // ng-router
}
// var injector = angular.injector(['ng'])
// injector.invoke(['$rootScope', patch])
window.angular.module('ngOpbeat', [])
  .config(['$provide', patch])
  .run(['$rootScope', appRun])
module.exports = {}
angular.bootstrap = transactionService.zone.bind(angular.bootstrap)
