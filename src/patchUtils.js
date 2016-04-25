module.exports = {
  patchFunction: function patchModule (delegate, options) {},
  _copyProperties: function _copyProperties (source, target) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key]
      }
    }
  },
  wrapAfter: function wrapAfter (fn, wrapWith) {
    return function () {
      var res = fn.apply(this, arguments)
      wrapWith.apply(this, arguments)
      return res
    }
  },
  wrapBefore: function wrapBefore (fn, wrapWith) {
    return function () {
      wrapWith.apply(this, arguments)
      return fn.apply(this, arguments)
    }
  },
  wrap: function (fn, before, after) {
    return function () {
      before.apply(this, arguments)
      var res = fn.apply(this, arguments)
      after.apply(this, arguments)
      return res
    }
  },
  argumentsToArray: function argumentsToArray (args) {
    var newArgs = []
    for (var i = 0; i < args.length; i++) {
      newArgs[i] = args[i]
    }
    return newArgs
  }
}
