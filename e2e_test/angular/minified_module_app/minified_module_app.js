function init (opbeatConfig) {
  var ctrl = require('../common/exponential_ctrl')
  var app = window.angular.module('minified_module_app', ['ui.router', 'ngOpbeat'])

  app.config(function ($stateProvider, $urlRouterProvider) {
    var routeConfig = {
      url: '/',
      controller: 'expCtrl',
      templateUrl: 'common/exponential_ctrl.html'
    }

    $urlRouterProvider.otherwise('/')

    $stateProvider
      .state('exponentialstate', routeConfig)
  })

  app.config(function ($opbeatProvider) {
    $opbeatProvider.config(opbeatConfig)
  })

  app.controller('expCtrl', ctrl)
  return app
}

function bootstrap (element) {
  window.angular.bootstrap(element, ['minified_module_app'])
}

module.exports = {
  init: init,
  bootstrap: bootstrap,
  appName: 'minified_module_app'
}
