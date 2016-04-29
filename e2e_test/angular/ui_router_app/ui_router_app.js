function init (opbeatConfig) {
  var ctrl = require('../common/exponential_ctrl')
  var app = window.angular.module('ui_router_app', ['ui.router', 'ngOpbeat'])

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

  app.run(function ($opbeat) {
    $opbeat.setUserContext({test: 'test'})
  })

  app.controller('expCtrl', ctrl)
  return app
}

function bootstrap (element) {
  window.angular.bootstrap(element, ['ui_router_app'])
}

module.exports = {
  init: init,
  bootstrap: bootstrap,
  appName: 'ui_router_app'
}
