function exponentialize (seed, times) {
  var res = seed
  for (var j = 0; j < times; j++) {
    res = res.concat(res)
  }
  return res
}

function exponentialCtrl ($scope, $http) {
  $scope.confirmation = function (conf) {
    $scope.confirmation = conf
  }

  var repeatArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  $scope.repeatArray = repeatArray
  setTimeout(function () {
    $scope.repeatArray.push(1)
    $scope.$apply()
  }, 0)

  $http.get('common/confirmation.json').then(function (response) {
    $scope.confirmation(response.data)
    $scope.repeatArray = exponentialize(repeatArray, 8)
  }, function () {
    throw new Error('Confirmation failed.')
  })
}

module.exports = exponentialCtrl
