var utils = require('../instrumentation/utils')

module.exports = function($provide, traceBuffer) {

  // Core directive instrumentation
  var coreDirectives = ['ngBind', 'ngClass', 'ngModel', 'ngIf', 'ngInclude', 'ngRepeat', 'ngSrc', 'ngStyle', 'ngSwitch', 'ngTransclude']
  coreDirectives.forEach(function (name) {
    var directiveName = name + 'Directive'
    $provide.decorator(directiveName, function ($delegate, $injector) {
      utils.instrumentObject($delegate[0], $injector, {
        type: 'template.angular.directive',
        prefix: directiveName
      })
      return $delegate
    })
  })

}
