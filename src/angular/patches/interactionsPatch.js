module.exports = function ($provide, transactionService) {
  'use strict'
  function patchEventDirective (delegate, eventName) {
    var nativeCompile = delegate.compile
    delegate.compile = function () {
      var nativeLink = nativeCompile.apply(this, arguments)
      return function (scope, element, attributes) {
        var directiveName = attributes.$normalize('ng-' + eventName)
        var action = attributes[directiveName]
        element.on(eventName, function (event) {
          transactionService.startTransaction(directiveName + ': ' + action, 'interaction')
        })
        return nativeLink.apply(this, arguments)
      }
    }
  }

  $provide.decorator('ngSubmitDirective', ['$delegate', '$injector', function ($delegate, $injector) {
    var directive = $delegate[0]
    patchEventDirective(directive, 'submit')
    return $delegate
  }])

  $provide.decorator('ngClickDirective', ['$delegate', '$injector', function ($delegate, $injector) {
    var ngClick = $delegate[0]
    patchEventDirective(ngClick, 'click')
    return $delegate
  }])
}
