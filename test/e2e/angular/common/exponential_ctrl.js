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
  $scope.fetchExtraData = function () {
    $http.get('common/confirmation.json').then(function (response) {
      $scope.extraData = exponentialize(repeatArray, 3)
    }, function () {
      throw new Error('Confirmation failed.')
    })
  }

  var repeatArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  $scope.repeatArray = repeatArray
  $scope.justAnObject = { key: 'value' }
  $scope.returnArrayFn = function () {
    return repeatArray
  }

  $http.get('common/confirmation.json').then(function (response) {
    $scope.confirmation(response.data)
    $scope.repeatArray = exponentialize(repeatArray, 8)
    if (window.e2e && typeof window.e2e.appInitialized === 'function') {
      window.e2e.appInitialized()
    }
  }, function () {
    throw new Error('Confirmation failed.')
  })
}

module.exports = exponentialCtrl
