var utils = require('../../src/instrumentation/utils')
var Promise = require('es6-promise').Promise

describe('instrumentation.utils.wrapMethod', function () {
  it('should create a new context for each function call', function (done) {
    var callCount = 0

    var queue = []
    var ctx = {
      ctxObj: 'ctxObj',
      fn: function fn (timeout) {
        var p = new Promise(function (resolve, reject) {
          setTimeout(function () {
            resolve()
          }, timeout)
        })
        var callBack
        p.finally = function (cb) {
          callBack = cb
        }
        p.then(function () {
          callBack()
        })
        return p
      },
      beforeFn: function beforeFn (c) {
        expect(c.newProp).toBeUndefined()
        c.newProp = 'newProp'
        c.timeout = arguments[1]
        expect(c.ctxObj).toEqual('ctxObj')
        expect(c).not.toBe(ctx)
        return {}
      },
      afterFn: function afterFn (c) {
        expect(c.ctxObj).toEqual('ctxObj')
        expect(c.newProp).toBe('newProp')
        c.newProp = 'changed'
        queue.push(c.timeout)
        expect(c).not.toBe(ctx)
        callCount++
        if (callCount === 2) {
          expect(queue).toEqual([10, 1000])
          done()
        }
      }
    }

    spyOn(ctx, 'beforeFn').and.callThrough()
    spyOn(ctx, 'fn').and.callThrough()
    spyOn(ctx, 'afterFn').and.callThrough()

    var wrappedFn = utils.wrapMethod(ctx.fn, ctx.beforeFn, ctx.afterFn, ctx)
    wrappedFn(1000)
    wrappedFn(10)

    expect(ctx.beforeFn).toHaveBeenCalled()
    expect(ctx.fn).toHaveBeenCalled()
  })

  it('should not change arguments of the function', function () {
    function fn (i) {
      return Array.prototype.slice.call(arguments)
    }

    var wrappedFn = utils.wrapMethod(fn, undefined, undefined, {})
    var sampleArg = [{ prop: 'this is prop' }]

    var result = wrappedFn.apply({}, sampleArg)
    expect(result).toEqual(sampleArg)
  })

  it('should call in the order of beforeFn, Fn, afterFn', function () {
    var ctxObj = {
      beforeFn: function () {
        expect(ctxObj.fn.calls.count()).toBe(0)
        expect(ctxObj.afterFn.calls.count()).toBe(0)
        return {}
      },
      fn: function () {
        expect(ctxObj.beforeFn.calls.count()).toBe(1)
        expect(ctxObj.afterFn.calls.count()).toBe(0)
      },
      afterFn: function () {
        expect(ctxObj.fn.calls.count()).toBe(1)
        expect(ctxObj.beforeFn.calls.count()).toBe(1)
      }
    }

    spyOn(ctxObj, 'beforeFn').and.callThrough()
    spyOn(ctxObj, 'fn').and.callThrough()
    spyOn(ctxObj, 'afterFn').and.callThrough()

    var wrappedFn = utils.wrapMethod(ctxObj.fn, ctxObj.beforeFn, ctxObj.afterFn, {})
    wrappedFn()

    expect(ctxObj.beforeFn).toHaveBeenCalled()
    expect(ctxObj.fn).toHaveBeenCalled()
    expect(ctxObj.afterFn).toHaveBeenCalled()
  })

  describe('annotation', function () {
    it('should return $inject', function () {
      function fn () {}
      var inject = fn.$inject = ['a']
      utils.wrapMethod(fn)
      expect(fn.$inject).toBe(inject)
      expect(utils.wrapMethod(function () {}).$inject).toEqual([])
      expect(utils.wrapMethod(function () {}).$inject).toEqual([])
      expect(utils.wrapMethod(function () {}).$inject).toEqual([])
      expect(utils.wrapMethod(function /* */ () {}).$inject).toEqual([])
    })

    it('should parse arguments correctly', function () {
      function fn ($scope, param2, i) {
      }
      var wrappedFn = utils.wrapMethod(fn)
      expect(wrappedFn.$inject).toEqual(['$scope', 'param2', 'i'])
    })

    it('should insert $inject only if it does not exits', function () {
      function fn () {}
      fn.$inject = ['param1', 'param2']
      var wrappedFn = utils.wrapMethod(fn)
      expect(wrappedFn.$inject).toBe(fn.$inject)
    })

    it('should create $inject', function () {
      var extraParans = function () {}
      function $f_n0 /*
          */(
        $a, // x, <-- looks like an arg but it is a comment
        b_, /* z, <-- looks like an arg but it is a
                 multi-line comment
                 function(a, b) {}
                 */
        _c,
        /* {some type} */ d) { extraParans() }

      expect(utils.wrapMethod($f_n0).$inject).toEqual(['$a', 'b_', '_c', 'd'])
    })

    it('should strip leading and trailing underscores from arg name during inference', function () {
      function beforeEachFn (_foo_) { /* foo = _foo_ */ }
      expect(utils.wrapMethod(beforeEachFn).$inject).toEqual(['foo'])
    })

    it('should not strip service names with a single underscore', function () {
      function beforeEachFn (_) { /* _ = _ */ }
      expect(utils.wrapMethod(beforeEachFn).$inject).toEqual(['_'])
    })

    it('should handle no arg functions', function () {
      function $f_n0 () {}
      expect(utils.wrapMethod($f_n0).$inject).toEqual([])
    })

    it('should handle no arg functions with spaces in the arguments list', function () {
      function fn () {}
      expect(utils.wrapMethod(fn).$inject).toEqual([])
    })

    it('should handle args with both $ and _', function () {
      function $f_n0 ($a_) {}
      expect(utils.wrapMethod($f_n0).$inject).toEqual(['$a_'])
    })

    xit('should throw on non function arg', function () {
      expect(function () {
        utils.wrapMethod({})
      }).toThrow()
    })
  })
})
