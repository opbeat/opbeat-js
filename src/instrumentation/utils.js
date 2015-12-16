var logger = require('../lib/logger')
var utils = require('../lib/utils')
var config = require('../lib/config')
var transactionStore = require('./transactionStore')

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m
var FN_ARG_SPLIT = /,/
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg

module.exports = {
  wrapMethod: function (_opbeatOriginalFunction, _opbeatBefore, _opbeatAfter, _opbeatContext) {
    var namedArguments = _extractNamedFunctionArgs(_opbeatOriginalFunction).join(',')
    var context = {
      _opbeatOriginalFunction: _opbeatOriginalFunction,
      _opbeatBefore: _opbeatBefore,
      _opbeatAfter: _opbeatAfter,
      _opbeatContext: _opbeatContext
    }

    return _buildWrapperFunction(context, namedArguments)
  },

  instrumentMethodWithCallback: function (fn, fnName, type, options) {
    options = options || {}
    var nameParts = []

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentMethodWithCallback.not.installed')
      return fn
    }

    if (options.prefix) {
      if (typeof options.prefix === 'function') {
        var args = options.wrapper ? options.wrapper.args : []
        options.prefix = options.prefix.call(this, args)
      }
      nameParts.push(options.prefix)
    }

    if (fnName) {
      nameParts.push(fnName)
    }

    var name = nameParts.join('.')
    var ref = fn
    var context = {
      traceName: name,
      traceType: type,
      traceBuffer: options.traceBuffer,
      transactionStore: transactionStore,
      fn: fn,
      options: options
    }

    var wrappedMethod = this.wrapMethod(ref, function instrumentMethodWithCallbackBefore (context) {
      var args = Array.prototype.slice.call(arguments).slice(1)
      var callback = args[options.callbackIndex]

      // Wrap callback
      var wrappedCallback = this.wrapMethod(callback, function instrumentMethodWithCallbackBeforeCallback () {
        instrumentMethodAfter.apply(this, [context])
        return {}
      }, null)

      // Override callback with wrapped one
      args[context.options.callbackIndex] = wrappedCallback

      // Call base
      return instrumentMethodBefore.apply(this, [context].concat(args))
    }.bind(this), null, context)

    wrappedMethod.original = ref

    return wrappedMethod
  },

  instrumentMethod: function (fn, type, options) {
    options = options || {}

    var nameParts = []

    if (options.prefix) {
      if (typeof options.prefix === 'function') {
        var args = options.wrapper ? options.wrapper.args : []
        options.prefix = options.prefix.call(this, args)
      }
      nameParts.push(options.prefix)
    }

    var fnName
    if (typeof fn === 'function' && fn.name) {
      fnName = fn.name
    } else if (options.fnName) {
      fnName = options.fnName
    }

    if (fnName) {
      nameParts.push(fnName)
    }

    var name = nameParts.join('.')

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentMethod.not.installed')
      return fn
    }

    var traceType
    if (typeof type === 'function') {
      traceType = type.call(options)
    } else {
      traceType = type
    }

    var context = {
      traceName: name,
      traceType: traceType,
      traceBuffer: options.traceBuffer,
      options: options,
      fn: fn,
      fnName: fnName,
      transactionStore: transactionStore
    }

    var wrappedMethod = this.wrapMethod(fn, instrumentMethodBefore, instrumentMethodAfter, context)
    wrappedMethod.original = fn

    // Copy all properties over
    _copyProperties(wrappedMethod.original, wrappedMethod)

    return wrappedMethod
  },

  instrumentModule: function ($delegate, $injector, options) {
    var self = this

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentModule.not.installed')
      return $delegate
    }

    var opbeatInstrumentInstanceWrapperFunction = function () {
      var args = Array.prototype.slice.call(arguments)

      var wrapped = $delegate

      // Instrument wrapped constructor
      if (options.instrumentConstructor) {
        wrapped = self.instrumentMethod($delegate, options.type, options)
      }

      var result = wrapped.apply(this, args)

      options.wrapper = {
        args: args
      }

      self.instrumentObject(result, $injector, options)
      return result
    }

    // Copy all static properties over
    _copyProperties($delegate, opbeatInstrumentInstanceWrapperFunction)
    this.instrumentObject(opbeatInstrumentInstanceWrapperFunction, $injector, options)

    return opbeatInstrumentInstanceWrapperFunction
  },

  instrumentObject: function (object, $injector, options) {
    options = options || {}

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentObject.not.installed')
      return object
    }

    // Instrument static functions
    this.getObjectFunctions(object).forEach(function (funcScope) {
      var subOptions = utils.mergeObject(options, {})
      subOptions.fnName = funcScope.property
      object[funcScope.property] = this.instrumentMethod(funcScope.ref, options.type, subOptions)
    }.bind(this))

    return object
  },

  uninstrumentMethod: function (module, fn) {
    var ref = module[fn]
    if (ref.original) {
      module[fn] = ref.original
    }
  },

  getObjectFunctions: function (scope) {
    return Object.keys(scope).filter(function (key) {
      return typeof scope[key] === 'function'
    }).map(function (property) {
      var ref = scope[property]
      return {
        scope: scope,
        property: property,
        ref: ref
      }
    })
  },

  getControllerInfoFromArgs: function (args) {
    var scope, name

    if (typeof args[0] === 'string') {
      name = args[0]
    } else if (typeof args[0] === 'function') {
      name = args[0].name

      // Function has been wrapped by us, use original function name
      if (name === 'opbeatFunctionWrapper' && args[0].original) {
        name = args[0].original.name
      }
    }

    if (typeof args[1] === 'object') {
      scope = args[1].$scope
    }

    return {
      scope: scope,
      name: name
    }
  },

  resolveAngularDependenciesByType: function ($rootElement, type) {
    var appName = $rootElement.attr('ng-app') || config.get('angularAppName')

    if (!appName) {
      return []
    }

    return window.angular.module(appName)._invokeQueue.filter(function (m) {
      return m[1] === type
    }).map(function (m) {
      return m[2][0]
    })
  }
}

function instrumentMethodBefore (context) {
  // Optimized copy of arguments (V8 https://github.com/GoogleChrome/devtools-docs/issues/53#issuecomment-51941358)
  var args = new Array(arguments.length)
  for (var i = 0, l = arguments.length; i < l; i++) {
    args[i] = arguments[i]
  }

  args = args.slice(1)

  var name = context.traceName
  var transactionStore = context.transactionStore

  var transaction = transactionStore.getRecentByUrl(window.location.href)
  if (!transaction && context.traceBuffer && !context.traceBuffer.isLocked()) {
    transaction = context.traceBuffer
  }

  if (context.options.signatureFormatter) {
    name = context.options.signatureFormatter.apply(this, [context.fnName, args, context.options])
  }

  if (transaction) {
    var trace = transaction.startTrace(name, context.traceType, context.options)
    context.trace = trace
  } else {
    logger.log('%c instrumentMethodBefore.error.transaction.missing', 'background-color: #ffff00', context)
  }

  return {
    args: args
  }
}

function _copyProperties (source, target) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key]
    }
  }
}

function instrumentMethodAfter (context) {
  if (context.trace) {
    context.trace.end()
  }
}

function _extractNamedFunctionArgs (fn) {
  var fnText = fn.toString().replace(STRIP_COMMENTS, '')
  var argDecl = fnText.match(FN_ARGS)

  if (argDecl.length === 2) {
    return argDecl[1].split(FN_ARG_SPLIT)
  }

  return []
}

function _buildWrapperFunction (ctx, funcArguments) {
  var funcBody = 'var args = new Array(arguments.length)\n' +
    'for (var i = 0, l = arguments.length; i < l; i++) {\n' +
    '  args[i] = arguments[i]\n' +
    '}\n' +
    '// Before callback\n' +
    'if (typeof _opbeatBefore === "function") {\n' +
    'var beforeData = _opbeatBefore.apply(this, [_opbeatContext].concat(args))\n' +
    'if (beforeData.args) {\n' +
    ' args = beforeData.args\n' +
    '}\n' +
    '}\n' +
    '// Execute original function\n' +
    'var result = _opbeatOriginalFunction.apply(this, args)\n' +
    '// After callback\n' +
    'if (typeof _opbeatAfter === "function") {\n' +
    '  // After + Promise handling\n' +
    '  if (result && typeof result.then === "function") {\n' +
    '    result.finally(function () {\n' +
    '      _opbeatAfter.apply(this, [_opbeatContext].concat(args))\n' +
    '    }.bind(this))\n' +
    '  } else {\n' +
    '    _opbeatAfter.apply(this, [_opbeatContext].concat(args))\n' +
    '  }\n' +
    '}\n' +
    'return result\n'

  var newBody = []
  for (var k in ctx) {
    var i = 'var ' + k + ' = ctx["' + k + '"];'
    newBody.push(i)
  }

  var res = 'return function opbeatFunctionWrapper(' + funcArguments + '){ ' + funcBody + ' }'
  newBody.push(res)
  var F = new Function('ctx', newBody.join('\n')) // eslint-disable-line no-new-func
  return F(ctx)
}
