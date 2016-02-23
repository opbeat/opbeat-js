var app = angular.module('app', ['ngRoute', 'ngAnimate', 'ngOpbeat'])

app.config(function ($routeProvider) {
  var routeConfig = {
    controller: 'MainCtrl',
    templateUrl: 'main_ctrl.html'
  }

  $routeProvider
    .when('/', routeConfig)
    .otherwise({
      redirectTo: '/'
    })
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
app.directive('customDirective', function () {
  return {
    template: '<div ng-bind="test"></div>',
    link: function link (scope, element, attrs, controller, transcludeFn) {
      scope.test = 'customDirective'
    }
  }
})

app.controller('MainCtrl', function mainCtrl ($scope, $http) {
  $scope.confirmation = function (conf) {
    $scope.confirmation = conf
  }

  $http.get('confirmation.json').then(function (response) {
    $scope.confirmation(response.data)
  }, function () {
    throw new Error('Confirmation failed.')
  })
})
