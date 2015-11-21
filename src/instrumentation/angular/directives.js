var utils = require('../utils')

module.exports = function ($provide) {
  var instrumentDirective = function (name) {
    var directiveName = name + 'Directive'
    $provide.decorator(directiveName, ['$delegate', '$injector', function ($delegate, $injector) {
      utils.instrumentObject($delegate[0], $injector, {
        type: 'template.angular.directive',
        prefix: directiveName
      })
      return $delegate
    }])
  }

  return {
    instrumentAll: function (modules) {
      console.log('instrumentationAll', modules)
      modules.forEach(function (name) {
        instrumentDirective(name)
      })
    },
    instrumentCore: function () {
      // Core directive instrumentation
      var coreDirectives = ['ngBind', 'ngClass', 'ngModel', 'ngIf', 'ngInclude', 'ngRepeat', 'ngSrc', 'ngStyle', 'ngSwitch', 'ngTransclude']
      coreDirectives.forEach(function (name) {
        instrumentDirective(name)
      })
    }
  }
}
