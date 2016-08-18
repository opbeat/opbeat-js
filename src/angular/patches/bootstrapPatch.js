function runInOpbeatZone (zoneService, fn, applyThis, applyArgs) {
  if (zoneService.zone.name === window.Zone.current.name) {
    return fn.apply(applyThis, applyArgs)
  } else {
    return zoneService.zone.run(fn, applyThis, applyArgs)
  }
}

function patchMainBootstrap (zoneService, beforeBootstrap) {
  if (typeof window.angular === 'undefined') {
    return
  }
  var originalBootstrapFn = window.angular.bootstrap

  function bootstrap (element, modules) {
    beforeBootstrap(modules)
    return runInOpbeatZone(zoneService, originalBootstrapFn, window.angular, arguments)
  }

  Object.defineProperty(window.angular, 'bootstrap', {
    get: function () {
      if (typeof originalBootstrapFn === 'function') {
        return bootstrap
      } else {
        return originalBootstrapFn
      }
    },
    set: function (bootstrapFn) {
      originalBootstrapFn = bootstrapFn
    }
  })
}

function patchDeferredBootstrap (zoneService, beforeBootstrap) {
  if (typeof window.angular === 'undefined') {
    return
  }
  var DEFER_LABEL = 'NG_DEFER_BOOTSTRAP!'
  var deferRegex = new RegExp('^' + DEFER_LABEL + '.*')
  // If the bootstrap is already deferred. (like run by Protractor)
  // In this case `resumeBootstrap` should be patched
  if (deferRegex.test(window.name)) {
    var originalResumeBootstrap
    Object.defineProperty(window.angular, 'resumeBootstrap', {
      get: function () {
        return function (modules) {
          beforeBootstrap(modules)
          return runInOpbeatZone(zoneService, originalResumeBootstrap, window.angular, arguments)
        }
      },
      set: function (resumeBootstrap) {
        originalResumeBootstrap = resumeBootstrap
      }
    })
  } else { // If this is not a test, defer bootstrapping
    window.name = DEFER_LABEL + window.name

    window.angular.resumeDeferredBootstrap = function () {
      var modules = []
      beforeBootstrap(modules)
      return runInOpbeatZone(zoneService, window.angular.resumeBootstrap, window.angular, [modules])
    }
    /* angular should remove DEFER_LABEL from window.name, but if angular is never loaded, we want
     to remove it ourselves */
    window.addEventListener('beforeunload', function () {
      if (deferRegex.test(window.name)) {
        window.name = window.name.substring(DEFER_LABEL.length)
      }
    })
  }
}

function createAngular (zoneService, beforeBootstrap) {
  // with this method we can initialize opbeat-angular before or after angular is loaded
  var alreadyPatched = false
  var originalAngular = window.angular
  // todo: check if defineProperty exists, add it isPlatformSupported
  // we don't support browsers that don't have defineProperty (IE<9)
  Object.defineProperty(window, 'angular', {
    get: function () {
      return originalAngular
    },
    set: function (value) {
      originalAngular = value
      if (!alreadyPatched && typeof originalAngular === 'object') {
        alreadyPatched = true
        patchMainBootstrap(zoneService, beforeBootstrap)
        patchDeferredBootstrap(zoneService, beforeBootstrap)
      }
    },
    enumerable: true,
    configurable: true
  })
}

function noop () {}
function patchAngularBootstrap (zoneService, beforeBootstrap) {
  if (typeof beforeBootstrap !== 'function') {
    beforeBootstrap = noop
  }

  if (window.angular) {
    patchMainBootstrap(zoneService, beforeBootstrap)
    patchDeferredBootstrap(zoneService, beforeBootstrap)
  } else {
    createAngular(zoneService, beforeBootstrap)
  }
}

module.exports = patchAngularBootstrap
