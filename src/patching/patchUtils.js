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
  },
  opbeatSymbol: opbeatSymbol,
  patchMethod: patchMethod
}

function opbeatSymbol (name) {
  return '__opbeat_symbol__' + name
}

function patchMethod (target, name, patchFn) {
  var proto = target
  while (proto && !proto.hasOwnProperty(name)) {
    proto = Object.getPrototypeOf(proto)
  }
  if (!proto && target[name]) {
    // somehow we did not find it, but we can see it. This happens on IE for Window properties.
    proto = target
  }
  var delegateName = opbeatSymbol(name)
  var delegate
  if (proto && !(delegate = proto[delegateName])) {
    delegate = proto[delegateName] = proto[name]
    proto[name] = createNamedFn(name, patchFn(delegate, delegateName, name))
  }
  return delegate
}

function createNamedFn (name, delegate) {
  try {
    return (Function('f', 'return function ' + name + '(){return f(this, arguments)}'))(delegate)
  } catch (e) {
    // if we fail, we must be CSP, just return delegate.
    return function () {
      return delegate(this, arguments)
    }
  }
}
