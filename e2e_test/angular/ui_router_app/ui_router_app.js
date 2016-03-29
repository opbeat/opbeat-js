function init () {
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
    $opbeatProvider.config({
      debug: true,
      orgId: '7f9fa667d0a349dd8377bc740bcfc33e',
      appId: '0a8757798e',
      performance: {
        enable: true,
        enableStackFrames: true
      }
    })
  })

  app.controller('expCtrl', ctrl)
}

function bootstrap (element) {
  window.angular.bootstrap(element, ['ui_router_app'])
}

module.exports = {
  init: init,
  bootstrap: bootstrap,
  appName: 'ui_router_app'
}
