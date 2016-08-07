
function patchAngularBootstrap (zoneService) {
  var DEFER_LABEL = 'NG_DEFER_BOOTSTRAP!'

  var deferRegex = new RegExp('^' + DEFER_LABEL + '.*')
  // If the bootstrap is already deferred. (like run by Protractor)
  // In this case `resumeBootstrap` should be patched
  if (deferRegex.test(window.name)) {
    var originalResumeBootstrap
    Object.defineProperty(window.angular, 'resumeBootstrap', {
      get: function () {
        return function (modules) {
          return zoneService.zone.run(function () {
            originalResumeBootstrap.call(window.angular, modules)
          })
        }
      },
      set: function (resumeBootstrap) {
        originalResumeBootstrap = resumeBootstrap
      }
    })
  } else { // If this is not a test, defer bootstrapping
    window.name = DEFER_LABEL + window.name

    window.angular.resumeDeferredBootstrap = function () {
      return zoneService.zone.run(function () {
        var resumeBootstrap = window.angular.resumeBootstrap
        return resumeBootstrap.call(window.angular)
      })
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

module.exports = patchAngularBootstrap
