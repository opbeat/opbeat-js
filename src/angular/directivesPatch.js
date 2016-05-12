var utils = require('../lib/utils')
module.exports = function ($provide, transactionService) {
  'use strict'
  $provide.decorator('ngRepeatDirective', ['$delegate', '$injector', function ($delegate, $injector) {
    var ngRepeat = $delegate[0]
    var _compile = ngRepeat.compile

    ngRepeat.compile = function () {
      var _linkFn = _compile.apply(this, arguments)
      return function () {
        var scope = arguments[0]

        var _watchCollection = scope.$watchCollection

        scope.$watchCollection = function (watchExpression, reactionFunction) {
          var watchStr = humanReadableWatchExpression(watchExpression)
          if (typeof reactionFunction === 'function') {
            // todo: angular $watchCollection only sends oldValue if (listenerFn.length > 1)
            arguments[1] = function (newValue) {
              var runtimeInfo = ''
              if (watchStr != null) {
                var arrayLength = Array.isArray(newValue) ? '[' + newValue.length + ']' : ''
                runtimeInfo = watchStr + arrayLength
              }

              var traceName = 'ngRepeat ' + runtimeInfo
              var traceType = 'template.ngRepeat'
              var trace = transactionService.startTrace(traceName, traceType, { 'enableStackFrames': false })
              var ret = reactionFunction.apply(this, arguments)

              if (!utils.isUndefined(trace)) {
                trace.end()
              }
              return ret
            }
          }
          _watchCollection.apply(this, arguments)
        }
        var ret = _linkFn.apply(this, arguments)

        // Should set $watchCollection back since the scope could be shared with other components
        scope.$watchCollection = _watchCollection
        return ret
      }
    }
    return $delegate
  }])

  // function patchEventDirective (delegate, eventName) {
  //   var nativeCompile = delegate.compile
  //   delegate.compile = function () {
  //     var nativeLink = nativeCompile.apply(this, arguments)
  //     return function (scope, element, attributes) {
  //       var directiveName = attributes.$normalize('ng-' + eventName)
  //       var action = attributes[directiveName]
  //       element.on(eventName, function (event) {
  //         transactionService.startTransaction(directiveName + ': ' + action, 'transaction')
  //       })
  //       return nativeLink.apply(this, arguments)
  //     }
  //   }
  // }

  // $provide.decorator('ngSubmitDirective', ['$delegate', '$injector', function ($delegate, $injector) {
  //   var directive = $delegate[0]
  //   patchEventDirective(directive, 'submit')
  //   return $delegate
  // }])

  // $provide.decorator('ngClickDirective', ['$delegate', '$injector', function ($delegate, $injector) {
  //   var ngClick = $delegate[0]
  //   patchEventDirective(ngClick, 'click')
  //   return $delegate
  // }])
}

function humanReadableWatchExpression (fn) {
  if (fn == null) {
    return null
  }
  if (fn.exp) {
    fn = fn.exp
  } else if (fn.name) {
    fn = fn.name
  }
  return fn.toString()
}
