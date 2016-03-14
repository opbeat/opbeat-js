var app = angular.module('app', ['ngRoute', 'ngResource', 'ngAnimate', 'ngOpbeat'])

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
function exponentialize (seed, times) {
  var res = seed
  for (var j = 0; j < times; j++) {
    res = res.concat(res)
  }
  return res
}

app.controller('MainCtrl', function mainCtrl ($scope, $http, $resource) {
  $scope.confirmation = function (conf) {
    $scope.confirmation = conf
  }

  var repeatArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  $scope.repeatArray = repeatArray
  setTimeout(function () {
    $scope.repeatArray.push(1)
    $scope.$apply()
  }, 0)

  $http.get('confirmation.json').then(function (response) {
    $scope.confirmation(response.data)
    $scope.repeatArray = exponentialize(repeatArray, 8)
  }, function () {
    throw new Error('Confirmation failed.')
  })
})
function startApp () {
  angular.bootstrap(document, ['app'])
}

startApp()

module.exports = {}
