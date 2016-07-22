function init (opbeatConfig) {
  var ctrl = require('../common/exponential_ctrl')
  var app = window.angular.module('ui_router_app', ['ui.router', 'ngOpbeat'])

  app.config(function ($stateProvider, $urlRouterProvider) {
    var routeConfig = {
      abstract: true,
      url: '/',
      controller: 'expCtrl',
      templateUrl: 'common/exponential_ctrl.html',
      deepStateRedirect: { default: 'ui_router_app_exponentialstate.substate' }
    }

    $urlRouterProvider.otherwise('/')

    $stateProvider
      .state('ui_router_app_exponentialstate', routeConfig)
      .state('ui_router_app_exponentialstate.substate', {
        url: '',
        controller: function ($scope) {
          $scope.test = 'passed'
        },
        template: '<div ng-bind="test"></div>'
      })
  })

  app.config(function ($opbeatProvider) {
    $opbeatProvider.config(opbeatConfig)
  })

  app.run(function ($opbeat) {
    $opbeat.setUserContext({ test: 'test' })
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
