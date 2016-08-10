function init () {
  var app = window.angular.module('simple_app', ['ngRoute', 'ngOpbeat'])
  app.config(function ($routeProvider) {
    var routeConfig = {
      controller: 'MainCtrl',
      templateUrl: 'simple_app/main_ctrl.html'
    }

    $routeProvider
      .when('/', routeConfig)
      .otherwise({
        redirectTo: '/'
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
  function exponentialize (seed, times) {
    var res = seed
    for (var j = 0; j < times; j++) {
      res = res.concat(res)
    }
    return res
  }

  app.controller('MainCtrl', function mainCtrl ($scope, $http) {
    $scope.confirmation = function (conf) {
      $scope.confirmation = conf
    }

    var repeatArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]


    $http.get('simple_app/confirmation.json').then(function (response) {
      $scope.confirmation(response.data)
      $scope.repeatArray = exponentialize(repeatArray, 8)
    }, function () {
      throw new Error('Confirmation failed.')
    })
  })
}
function bootstrap (element) {
  window.angular.bootstrap(element, ['simple_app'])
}

var simple_app = {
  init: init,
  bootstrap: bootstrap,
  appName: 'simple_app'
}
if (typeof module !== 'undefined') {
  module.exports = simple_app
} else {
  window.simple_app = simple_app
}
