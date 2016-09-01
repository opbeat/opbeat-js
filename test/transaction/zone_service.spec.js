var ZoneService = require('../../src/transaction/zone_service')
var ServiceContainer = require('../../src/common/serviceContainer')
var ServiceFactory = require('../../src/common/serviceFactory')
var patchCommon = require('../../src/common/patchCommon')

var logger = require('loglevel')

describe('ZoneService', function () {
  var zoneService
  var originalTimeout
  var serviceContainer = new ServiceContainer(new ServiceFactory())
  patchCommon(serviceContainer)

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000
  })
  zoneService = new ZoneService(window.Zone.current, logger)

  function resetZoneCallbacks (zoneService) {
    zoneService.spec.onScheduleTask = function (task) {}
    zoneService.spec.onBeforeInvokeTask = function () {}
    zoneService.spec.onInvokeTask = function (task) {}
    zoneService.spec.onCancelTask = function (task) {}
    zoneService.spec.onHandleError = function (task) {}
  }

  it('should call registered event listeners for XHR', function (done) {
    var response

    zoneService.spec.onScheduleTask = function (task) {
      expect(response).toBeUndefined()
      expect(task.XHR.url).toBe('/')
      expect(task.XHR.method).toBe('GET')
    }
    zoneService.spec.onBeforeInvokeTask = function (task) {
      expect(zoneService.spec.onScheduleTask).toHaveBeenCalled()
    }
    zoneService.spec.onInvokeTask = function (task) {
      expect(response).toBeDefined()
      expect(zoneService.spec.onBeforeInvokeTask).toHaveBeenCalled()

      // should call done asynchronously since we're spying in this function in multiple tests
      setTimeout(function () {
        done()
      })
    }

    spyOn(zoneService.spec, 'onScheduleTask').and.callThrough()
    spyOn(zoneService.spec, 'onBeforeInvokeTask').and.callThrough()
    spyOn(zoneService.spec, 'onInvokeTask').and.callThrough()

    zoneService.zone.run(function () {
      function reqListener () {
        response = this.responseText
      }

      var oReq = new window.XMLHttpRequest()
      oReq.addEventListener('load', reqListener)
      oReq.addEventListener('error', function (event) {
        console.log('failed')
      })

      oReq.open('GET', '/', true)
      oReq.send(null)
    })
  })

  it('should keep track of task for XHR if the event listeners are registered after send', function (done) {
    var response

    zoneService.spec.onScheduleTask = function (task) {
      expect(response).toBeUndefined()
    }
    zoneService.spec.onBeforeInvokeTask = function (task) {
      expect(zoneService.spec.onScheduleTask).toHaveBeenCalled()
    }
    zoneService.spec.onInvokeTask = function (task) {
      expect(response).toBeDefined()
      expect(zoneService.spec.onBeforeInvokeTask).toHaveBeenCalled()

      // should call done asynchronously since we're spying in this function in multiple tests
      setTimeout(function () {
        done()
      })
    }

    spyOn(zoneService.spec, 'onScheduleTask').and.callThrough()
    spyOn(zoneService.spec, 'onBeforeInvokeTask').and.callThrough()
    spyOn(zoneService.spec, 'onInvokeTask').and.callThrough()

    zoneService.zone.run(function () {
      function reqListener () {
        response = this.responseText
      }

      var oReq = new window.XMLHttpRequest()

      oReq.open('GET', '/', true)
      oReq.send(null)
      oReq.addEventListener('load', reqListener)
      oReq.addEventListener('error', function (event) {
        console.log('failed')
      })
    })
  })

  it('should keep track of tasks even if no event listeners are registered', function (done) {
    resetZoneCallbacks(zoneService)

    zoneService.spec.onBeforeInvokeTask = function (task) {
      expect(zoneService.spec.onScheduleTask).toHaveBeenCalled()
    }
    zoneService.spec.onInvokeTask = function (task) {
      expect(zoneService.spec.onBeforeInvokeTask).toHaveBeenCalled()

      // should call done asynchronously since we're spying in this function in multiple tests
      setTimeout(function () {
        done()
      })
    }

    spyOn(zoneService.spec, 'onScheduleTask').and.callThrough()
    spyOn(zoneService.spec, 'onBeforeInvokeTask').and.callThrough()
    spyOn(zoneService.spec, 'onInvokeTask').and.callThrough()

    zoneService.zone.run(function () {
      var oReq = new window.XMLHttpRequest()

      oReq.open('GET', '/', true)
      oReq.send(null)
    })
  })

  it('should call registered event listeners for XHR even if load event is not registered', function (done) {
    var response

    resetZoneCallbacks(zoneService)

    zoneService.spec.onScheduleTask = function (task) {
      expect(response).toBeUndefined()
    }
    zoneService.spec.onBeforeInvokeTask = function (task) {
      expect(zoneService.spec.onScheduleTask).toHaveBeenCalled()
    }
    zoneService.spec.onInvokeTask = function (task) {
      expect(response).toBeDefined()
      expect(zoneService.spec.onBeforeInvokeTask).toHaveBeenCalled()

      // should call done asynchronously since we're spying in this function in multiple tests
      setTimeout(function () {
        done()
      })
    }

    spyOn(zoneService.spec, 'onScheduleTask').and.callThrough()
    spyOn(zoneService.spec, 'onBeforeInvokeTask').and.callThrough()
    spyOn(zoneService.spec, 'onInvokeTask').and.callThrough()

    zoneService.zone.run(function () {
      function reqListener () {
        if (this.readyState === window.XMLHttpRequest.DONE) {
          response = this.responseText
        }
      }

      var oReq = new window.XMLHttpRequest()
      oReq.addEventListener('readystatechange', reqListener)
      oReq.addEventListener('error', function (event) {
        console.log('failed')
      })

      oReq.open('GET', '/', true)
      oReq.send(null)
    })
  })

  it('should not call registered event listeners for setTimeout if timeout > 0', function (done) {
    var callbackFlag = false
    // zoneService = new ZoneService(window.Zone.current.parent, logger)
    resetZoneCallbacks(zoneService)

    spyOn(zoneService.spec, 'onScheduleTask').and.callThrough()
    spyOn(zoneService.spec, 'onInvokeTask').and.callThrough()

    zoneService.spec.onInvokeTask.calls.reset()
    zoneService.spec.onScheduleTask.calls.reset()

    zoneService.zone.run(function () {
      setTimeout(function () {
        callbackFlag = true
      }, 1)

      setTimeout(function () {
        expect(callbackFlag).toBe(true)
        expect(zoneService.spec.onInvokeTask).not.toHaveBeenCalled()
        expect(zoneService.spec.onScheduleTask).not.toHaveBeenCalled()
        done()
      }, 10)
    })
  })

  it('should call registered event listeners for setTimeout if timeout == 0', function (done) {
    var callbackFlag = false
    // zoneService = new ZoneService(window.Zone.current.parent, logger)
    resetZoneCallbacks(zoneService)

    zoneService.spec.onInvokeTask = function (task) {
      expect(callbackFlag).toBe(true)
      expect(zoneService.spec.onScheduleTask).toHaveBeenCalled()
      done()
    }

    spyOn(zoneService.spec, 'onScheduleTask').and.callThrough()
    spyOn(zoneService.spec, 'onInvokeTask').and.callThrough()

    zoneService.zone.run(function () {
      setTimeout(function () {
        callbackFlag = true
      }, 0)
    })
  })

  it('should not throw if the setTimeout callbackFn is undefined', function (done) {
    resetZoneCallbacks(zoneService)
    zoneService.zone.run(function () {
      setTimeout(undefined, 0)
      done()
    })
  })

  it('should call registered event listeners for requestAnimationFrame', function (done) {
    var callbackFlag = false
    // zoneService = new ZoneService(window.Zone.current.parent, logger)
    resetZoneCallbacks(zoneService)

    zoneService.spec.onInvokeTask = function (task) {
      expect(callbackFlag).toBe(true)
      expect(zoneService.spec.onScheduleTask).toHaveBeenCalled()
      done()
    }

    spyOn(zoneService.spec, 'onScheduleTask').and.callThrough()
    spyOn(zoneService.spec, 'onInvokeTask').and.callThrough()

    zoneService.zone.run(function () {
      window.requestAnimationFrame(function () {
        callbackFlag = true
      })
    })
  })

  it('should run in the outer zone', function () {
    resetZoneCallbacks(zoneService)
    zoneService.zone.run(function () {
      expect(window.Zone.current.name).toBe('opbeatRootZone')
      zoneService.runOuter(function () {
        expect(window.Zone.current.name).toBe('<root>')
      })
    })
  })

  it('should work with synchronous XMLHttpRequest', function () {
    window.Zone.current.fork({}).run(function () {
      var req = new window.XMLHttpRequest()
      req.open('get', '/', false)
      req.send()
    })
  })

  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
  })
})
