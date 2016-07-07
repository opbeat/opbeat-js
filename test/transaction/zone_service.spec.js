var ZoneService = require('../../src/transaction/zone_service')
var PatchingService = require('../../src/patching/patchingService')

var logger = require('loglevel')
// require('zone.js')

describe('ZoneService', function () {
  var zoneService
  var originalTimeout
  var patchingService = new PatchingService()
  patchingService.patchAll()

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
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

  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
  })
})
