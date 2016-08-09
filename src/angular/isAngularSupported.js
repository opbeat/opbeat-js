
module.exports = function isAngularSupported () {
  var angular = window.angular
  return (angular.version && angular.version.major >= 1 && (angular.version.minor > 3 || angular.version.minor === 3 && angular.version.dot >= 12))
}

