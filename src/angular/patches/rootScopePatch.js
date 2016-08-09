module.exports = function ($provide, transactionService) {
  $provide.decorator('$rootScope', ['$delegate', '$injector', function ($delegate, $injector) {
    return decorateRootScope($delegate, transactionService)
  }])
}

function decorateRootScope ($delegate, transactionService) {
  var scopePrototype = ('getPrototypeOf' in Object)
    ? Object.getPrototypeOf($delegate) : $delegate.__proto__ // eslint-disable-line 

  var _digest = scopePrototype.$digest
  scopePrototype.$digest = function () {
    var trace = transactionService.startTrace('$scope.$digest', 'app.$digest', {'enableStackFrames': false})
    var ret = _digest.apply(this, arguments)
    if (trace) {
      trace.end()
    }
    return ret
  }
  return $delegate
}
