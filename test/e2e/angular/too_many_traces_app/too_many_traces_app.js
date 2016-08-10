var appName = 'too_many_traces_app'

function init (opbeatConfig) {
  var ctrl = require('./common/exponential_ctrl')
  var app = window.angular.module(appName, ['ui.router', 'ngOpbeat'])

  app.config(function ($stateProvider, $urlRouterProvider) {
    var routeConfig = {
      abstract: true,
      url: '/',
      controller: 'expCtrl',
      templateUrl: appName + '/common/exponential_ctrl.html',
      deepStateRedirect: { default: 'exponentialstate.substate' }
    }

    $urlRouterProvider.otherwise('/')

    $stateProvider
      .state('exponentialstate', routeConfig)
      .state('exponentialstate.substate', {
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
  window.angular.bootstrap(element, [appName])
}

module.exports = {
  init: init,
  bootstrap: bootstrap,
  appName: appName
}
