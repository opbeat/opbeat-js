module.exports = {

  wrap : function (fn, before, after) {
    return function opbeatInstrumentationWrapper () {
      var args = Array.prototype.slice.call(arguments)

      before.apply(this, args)

      var result = fn.apply(this, args)

      // Promise handling
      if (result && typeof result.then === 'function') {
        result.finally(function () {
          after.apply(this, args)
        }.bind(this))
      } else {
        after.apply(this, args)
      }

      return result
    }
  },

  instrumentMethod : function (module, fn, transaction, type, options) {
    options = options || {}
    var ref
    var name = options.prefix ? options.prefix + '.' + fn : fn

    if (options.instrumentModule) {
      ref = module
    } else {
      ref = module[fn]
    }

    ref.original = ref

    var wrappedMethod = this.wrap(ref, function instrumentMethodBefore () {
      ref.trace = transaction.startTrace(name, type)
    }, function instrumentMethodAfter () {
      if (ref.trace) {
        ref.trace.end()
      }
    })

    if (options.override) {
      module[fn] = wrappedMethod
    }

    return wrappedMethod
  },

  instrumentModule : function (module, $injector, options) {
    options = options || {}
    var that = this;

    var $rootScope = $injector.get('$rootScope')
    var $location = $injector.get('$location')

    var wrapper = function () {
      var fn = module
      var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]
      if (transaction) {
        fn = that.instrumentMethod(module, 'root', transaction, options.type, {
          prefix: options.prefix,
          override: false,
          instrumentModule: true
        })
      }

      return fn.apply(module, arguments)
    }

    // Instrument static functions
    this.getObjectFunctions(module).forEach(function (funcScope) {
      console.log('funcScope', funcScope)
      wrapper[funcScope.property] = function () {
        var fn = funcScope.ref
        var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]
        if (transaction) {
          fn = that.instrumentMethod(module, funcScope.property, transaction, options.type, {
            prefix: options.prefix,
            override: true
          })
        }

        return fn.apply(module, arguments)
      }
    })

    return wrapper
  },

  uninstrumentMethod: function (module, fn) {
    var ref = module[fn]
    if (ref.original) {
      module[fn] = ref.original
      if (module[fn].trace) {
        module[fn].trace = null
      }
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
    }

    if (typeof args[1] === 'object') {
      scope = args[1].$scope
    }

    return {
      scope: scope,
      name: name
    }
  }

}
