var logger = require('../lib/logger')
var config = require('../lib/config')
var transactionStore = require('./transactionStore')

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m
var FN_ARG_SPLIT = /,/
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg

module.exports = {
  wrapMethod: function (_opbeatOriginalFunction, _opbeatBefore, _opbeatAfter, _opbeatContext) {
    var namedArguments = extractNamedFunctionArgs(_opbeatOriginalFunction).join(',')
    var context = {
      _opbeatOriginalFunction: _opbeatOriginalFunction,
      _opbeatBefore: _opbeatBefore,
      _opbeatAfter: _opbeatAfter,
      _opbeatContext: _opbeatContext
    }

    return buildWrapperFunction(context, namedArguments)
  },

  instrumentMethodWithCallback: function (fn, fnName, transaction, type, options) {
    options = options || {}
    var nameParts = []

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentMethodWithCallback.not.installed')
      return fn
    }

    if (options.prefix) {
      nameParts.push(options.prefix)
    }

    if (fnName) {
      nameParts.push(fnName)
    }

    if (!transaction && options.traceBuffer && !options.traceBuffer.isLocked()) {
      transaction = options.traceBuffer
    }

    var name = nameParts.join('.')
    var ref = fn
    var context = {
      traceName: name,
      traceType: type,
      options: options,
      fn: fn,
      transaction: transaction
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

  instrumentMethod: function (module, fn, transaction, type, options) {
    options = options || {}
    var ref
    var nameParts = []

    if (options.prefix) {
      nameParts.push(options.prefix)
    }

    if (fn) {
      nameParts.push(fn)
    }

    var name = nameParts.join('.')

    if (!transaction && options.traceBuffer && !options.traceBuffer.isLocked()) {
      transaction = options.traceBuffer
    }

    if (options.instrumentModule) {
      ref = module
    } else {
      ref = module[fn]
    }

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentMethod.not.installed')
      return ref
    }

    if(typeof type === 'function') {
      traceType = type.call(options)
    } else {
      traceType = type
    }

    var context = {
      traceName: name,
      traceType: traceType,
      options: options,
      fn: fn,
      transaction: transaction
    }

    var wrappedMethod = this.wrapMethod(ref, instrumentMethodBefore, instrumentMethodAfter, context)
    wrappedMethod.original = ref

    if (options.override) {
      module[fn] = wrappedMethod
    }

    return wrappedMethod
  },

  instrumentStaticModule: function ($delegate, $injector, options) {

    var self = this;

    var opbeatInstrumentInstanceWrapperFunction  =  function () {
      var args = Array.prototype.slice.call(arguments)
      var wrapper = $delegate.apply(this, args)

      options.wrapper = {
        args: args
      }

      self.instrumentObject(wrapper, $injector, options)
      return wrapper
    }

    // Copy all static properties over
    for (var key in $delegate) {
      if ($delegate.hasOwnProperty(key)) {
        opbeatInstrumentInstanceWrapperFunction[key] = $delegate[key]
      }
    }

    return opbeatInstrumentInstanceWrapperFunction

  },

  instrumentModule: function (module, $injector, options) {
    options = options || {}
    var that = this

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentModule.not.installed')
      return module
    }

    var wrapper = function () {
      var fn = module
      var args = Array.prototype.slice.call(arguments)
      var transaction = transactionStore.getRecentByUrl($injector.get('$location').absUrl())

      if (!transaction && options.traceBuffer && !options.traceBuffer.isLocked()) {
        transaction = options.traceBuffer
      }

      if (transaction) {
        fn = that.instrumentMethod(module, '', transaction, options.type, {
          prefix: options.prefix,
          override: false,
          instrumentModule: true,
          signatureFormatter: options.signatureFormatter,
          config: options.config
        })
      } else {
        logger.log('%c instrumentModule.error.transaction.missing', 'background-color: #ffff00', module)
      }

      return fn.apply(module, args)
    }

    // Copy all properties over
    for (var key in module) {
      if (module.hasOwnProperty(key)) {
        wrapper[key] = module[key]
      }
    }

    // Instrument functions
    this.getObjectFunctions(module).forEach(function (funcScope) {
      wrapper[funcScope.property] = function () {
        var fn = funcScope.ref
        var args = Array.prototype.slice.call(arguments)
        var transaction = transactionStore.getRecentByUrl($injector.get('$location').absUrl())

        if (!transaction && options.traceBuffer && !options.traceBuffer.isLocked()) {
          transaction = options.traceBuffer
        }

        if (transaction) {
          fn = that.instrumentMethod(module, funcScope.property, transaction, options.type, {
            prefix: options.prefix,
            override: true,
            signatureFormatter: options.signatureFormatter
          })
        } else {
          logger.log('%c instrumentModule.error.transaction.missing', 'background-color: #ffff00', module)
        }

        return fn.apply(module, args)
      }
    })

    return wrapper
  },

  instrumentObject: function (object, $injector, options) {
    options = options || {}

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentObject.not.installed')
      return object
    }

    var transaction
    if (options.transaction) {
      transaction = options.transaction
    } else {
      var url = $injector.get('$location').absUrl()
      transaction = transactionStore.getRecentByUrl(url)
    }

    if (!transaction && options.traceBuffer && !options.traceBuffer.isLocked()) {
      transaction = options.traceBuffer
    }

    if (transaction) {
      // Instrument static functions
      this.getObjectFunctions(object).forEach(function (funcScope) {
        options.override = true;
        this.instrumentMethod(object, funcScope.property, transaction, options.type, options)
      }.bind(this))
    } else {
      logger.log('%c instrumentObject.error.transaction.missing', 'background-color: #ffff00', object)
    }

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
  var transaction = context.transaction

  if (context.options.signatureFormatter) {
    name = context.options.signatureFormatter.apply(this, [context.fn, args])
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

function instrumentMethodAfter (context) {
  if (context.trace) {
    context.trace.end()
  }
}

function extractNamedFunctionArgs (fn) {
  var fnText = fn.toString().replace(STRIP_COMMENTS, '')
  var argDecl = fnText.match(FN_ARGS)

  if (argDecl.length === 2) {
    return argDecl[1].split(FN_ARG_SPLIT)
  }

  return []
}

function buildWrapperFunction (ctx, funcArguments) {
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
