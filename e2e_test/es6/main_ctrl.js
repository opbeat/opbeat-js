 class MainCtrl {
  constructor($scope, $http, $resource) {
    $scope.test = 'passed'

    var User = $resource('user/:userId', {userId: '@id'})
    User.get({userId: 'user1'}, (user) => {
      console.log(user)
    })
      var test= test.test
    $http.get('response.json').then(() => {
      $scope.done = 'done'

    })
  }
}
MainCtrl.$inject = ['$scope', '$http', '$resource']

export {MainCtrl}