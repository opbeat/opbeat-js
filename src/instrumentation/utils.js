var logger = require('../lib/logger')
var utils = require('../lib/utils')
var config = require('../lib/config')
var transactionStore = require('./transactionStore')

module.exports = {
  wrapMethod: function (_opbeatOriginalFunction, _opbeatBefore, _opbeatAfter, _opbeatContext) {
    var context = {
      _opbeatOriginalFunction: _opbeatOriginalFunction,
      _opbeatBefore: _opbeatBefore,
      _opbeatAfter: _opbeatAfter,
      _opbeatContext: _opbeatContext
    }

    return wrapFn(context)
  },

  instrumentMethodWithCallback: function (fn, fnName, type, options) {
    options = options || {}
    var nameParts = []

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentMethodWithCallback.not.installed')
      return fn
    }

    if (!config.get('performance.enable')) {
      logger.log('- %c opbeat.instrumentation.instrumentMethodWithCallback.disabled', 'color: #3360A3')
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

      if (typeof callback === 'function') {
        // Wrap callback
        var wrappedCallback = this.wrapMethod(callback, function instrumentMethodWithCallbackBeforeCallback () {
          instrumentMethodAfter.apply(this, [context])
          return {}
        }, null)

        // Override callback with wrapped one
        args[context.options.callbackIndex] = wrappedCallback
      }

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

    if (!config.get('performance.enable')) {
      logger.log('- %c opbeat.instrumentation.instrumentMethod.disabled', 'color: #3360A3')
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

    var beforeMethod = instrumentMethodBefore
    var afterMethod = instrumentMethodAfter
    if (options.before) {
      beforeMethod = function (context) {
        options.before(context)
        return instrumentMethodBefore.apply(this, arguments)
      }
    }
    if (options.after) {
      afterMethod = function (context) {
        instrumentMethodAfter.apply(this, arguments)
        options.after(context)
      }
    }

    var wrappedMethod = this.wrapMethod(fn, beforeMethod, afterMethod, context)
    wrappedMethod.original = fn

    // Copy all properties over
    _copyProperties(wrappedMethod.original, wrappedMethod)

    // Set original prototype
    wrappedMethod.prototype = fn.prototype

    return wrappedMethod
  },

  instrumentModule: function ($delegate, $injector, options) {
    var self = this

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentModule.not.installed')
      return $delegate
    }

    if (!config.get('performance.enable')) {
      logger.log('- %c opbeat.instrumentation.instrumentModule.disabled', 'color: #3360A3')
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

      if (!utils.isUndefined(result)) {
        self.instrumentObject(result, $injector, options)
      }
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

    if (!config.get('performance.enable')) {
      logger.log('- %c opbeat.instrumentation.instrumentObject.disabled', 'color: #3360A3')
      return object
    }

    if (options.instrumentObjectFunctions === false) {
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

function wrapFn (ctx) {
  var _opbeatOriginalFunction = ctx['_opbeatOriginalFunction']
  var _opbeatBefore = ctx['_opbeatBefore']
  var _opbeatAfter = ctx['_opbeatAfter']
  var _opbeatContext = ctx['_opbeatContext']

  function opbeatFunctionWrapper () {
    var args = new Array(arguments.length)
    for (var i = 0, l = arguments.length; i < l; i++) {
      args[i] = arguments[i]
    }
    var zone = Object.create(_opbeatContext) // new zone for every call
    // Before callback
    if (typeof _opbeatBefore === 'function') {
      var beforeData = _opbeatBefore.apply(this, [zone].concat(args))
      if (beforeData.args) {
        args = beforeData.args
      }
    }
    // Execute original function
    var result = _opbeatOriginalFunction.apply(this, args)
    // After callback
    if (typeof _opbeatAfter === 'function') {
      // After + Promise handling
      if (result && typeof result.then === 'function') {
        result.finally(function () {
          _opbeatAfter.apply(this, [zone].concat(args))
        }.bind(this))
      } else {
        _opbeatAfter.apply(this, [zone].concat(args))
      }
    }
    return result
  }

  if (typeof _opbeatOriginalFunction.$inject === 'undefined') {
    opbeatFunctionWrapper.$inject = getAnnotation(_opbeatOriginalFunction)
  } else {
    opbeatFunctionWrapper.$inject = _opbeatOriginalFunction.$inject
  }
  return opbeatFunctionWrapper
}

// source: angular.js injector

var ARROW_ARG = /^([^\(]+?)=>/
var FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m
var FN_ARG_SPLIT = /,/
var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg

function extractArgs (fn) {
  var fnText = fn.toString().replace(STRIP_COMMENTS, '')
  var args = fnText.match(ARROW_ARG) || fnText.match(FN_ARGS)
  return args
}

function getAnnotation (fn) {
  var $inject
  var argDecl

  if (typeof fn === 'function') {
    if (!($inject = fn.$inject)) {
      $inject = []
      if (fn.length) {
        argDecl = extractArgs(fn)
        argDecl[1].split(FN_ARG_SPLIT).forEach(function (arg) {
          arg.replace(FN_ARG, function (all, underscore, name) {
            $inject.push(name)
          })
        })
      }
    }
  } else {
    //    throw  'Argument is not a function'
  }
  return $inject
}
