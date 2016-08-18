var patchAngularBootstrap = require('../../src/angular/patches/bootstrapPatch')
var ZoneServiceMock = require('../transaction/zone_service_mock.js')

describe('bootstrapPatch', function () {
  var originalAngular
  var zoneService
  var DEFER_LABEL = 'NG_DEFER_BOOTSTRAP!'

  beforeEach(function () {
    originalAngular = window.angular
    zoneService = new ZoneServiceMock()
  })

  it('should call bootstrap', function () {
    // can't use spies since we're also patching bootstrap
    var bootstrapCalled = false
    var beforeBootstrap = jasmine.createSpy('beforeBootstrap')
    zoneService.zone.name = '<root>'
    var fakeAngular = window.angular = {
      bootstrap: function (element, modules) {
        expect(element).toBe('document')
        expect(modules).toEqual(['modules'])
        expect(beforeBootstrap).toHaveBeenCalled()
        bootstrapCalled = true
        expect(typeof window.angular.resumeDeferredBootstrap).toBe('function')
        window.angular.resumeBootstrap = jasmine.createSpy('resumeBootstrap')
        window.angular.resumeDeferredBootstrap()
        expect(window.angular.resumeBootstrap).toHaveBeenCalled()
      }
    }

    patchAngularBootstrap(zoneService, beforeBootstrap)
    fakeAngular.bootstrap('document', ['modules'])
    expect(beforeBootstrap).toHaveBeenCalled()
    expect(bootstrapCalled).toBe(true)
  })

  it('should not call if angular is undefined', function () {
    var beforeBootstrap = jasmine.createSpy('beforeBootstrap')
    window.angular = undefined
    patchAngularBootstrap(zoneService, beforeBootstrap)
    expect(beforeBootstrap).not.toHaveBeenCalled()
    window.angular = {}
  })

  it('should not call beforeBootstrap if bootstrap is undefined', function () {
    var beforeBootstrap = jasmine.createSpy('beforeBootstrap')
    window.angular = {}
    patchAngularBootstrap(zoneService, beforeBootstrap)
    expect(beforeBootstrap).not.toHaveBeenCalled()
  })

  it('should beforeBootstrap after bootstrap is set but before it is called', function () {
    var beforeBootstrap = jasmine.createSpy('beforeBootstrap')
    window.angular = {}
    patchAngularBootstrap(zoneService, beforeBootstrap)
    expect(beforeBootstrap).not.toHaveBeenCalled()
    var bootstrapCalled = false
    window.angular.bootstrap = 'hamid'
    expect(window.angular.bootstrap).toBe('hamid')
    window.angular.bootstrap = function () {
      bootstrapCalled = true
    }
    window.angular.bootstrap()
    expect(beforeBootstrap).toHaveBeenCalled()
    expect(bootstrapCalled).toBe(true)
  })

  it('should patch resumeBootstrap if bootstrap is already deferred', function () {
    window.name = DEFER_LABEL + window.name
    var beforeBootstrap = jasmine.createSpy('beforeBootstrap')
    window.angular = {}
    patchAngularBootstrap(zoneService, beforeBootstrap)
    expect(beforeBootstrap).not.toHaveBeenCalled()
    window.angular.bootstrap = 'hamid'
    expect(window.angular.bootstrap).toBe('hamid')

    var bootstrapCalled = false
    window.angular.bootstrap = function () {
      bootstrapCalled = true
      window.angular.resumeBootstrap = function () {}
    }

    window.angular.bootstrap()
    window.angular.resumeBootstrap()
    expect(window.angular.resumeDeferredBootstrap).toBe(undefined)
    expect(beforeBootstrap).toHaveBeenCalled()
    expect(bootstrapCalled).toBe(true)
  })

  it('should patch resumeBootstrap if bootstrap is not called directly ', function () {
    window.name = DEFER_LABEL + window.name
    var beforeBootstrap = jasmine.createSpy('beforeBootstrap')
    window.angular = {}
    patchAngularBootstrap(zoneService, beforeBootstrap)

    expect(beforeBootstrap).not.toHaveBeenCalled()
    var resumeBootstrapCalled = false

    window.angular.resumeBootstrap = function () {
      resumeBootstrapCalled = true
    }

    window.angular.resumeBootstrap()
    expect(window.angular.resumeDeferredBootstrap).toBe(undefined)
    expect(beforeBootstrap).toHaveBeenCalled()
    expect(resumeBootstrapCalled).toBe(true)
  })

  it('should set resumeDeferredBootstrap if bootstrap is not deferred', function () {
    var beforeBootstrap = jasmine.createSpy('beforeBootstrap')
    window.angular = {}
    patchAngularBootstrap(zoneService, beforeBootstrap)

    expect(beforeBootstrap).not.toHaveBeenCalled()
    var resumeBootstrapCalled = false

    window.angular.resumeBootstrap = function () {
      resumeBootstrapCalled = true
    }

    expect(typeof window.angular.resumeDeferredBootstrap).toBe('function')
    window.angular.resumeDeferredBootstrap()
    expect(beforeBootstrap).toHaveBeenCalled()
    expect(resumeBootstrapCalled).toBe(true)
  })

  it('should set resumeDeferredBootstrap if bootstrap is not deferred and bootstrap is called directly', function () {
    var beforeBootstrap = jasmine.createSpy('beforeBootstrap')
    window.angular = {}
    patchAngularBootstrap(zoneService, beforeBootstrap)

    expect(beforeBootstrap).not.toHaveBeenCalled()
    var resumeBootstrapCalled = false

    var bootstrapCalled = false
    window.angular.bootstrap = function () {
      bootstrapCalled = true
      window.angular.resumeBootstrap = function () {
        resumeBootstrapCalled = true
      }
    }

    expect(typeof window.angular.resumeDeferredBootstrap).toBe('function')

    window.angular.bootstrap()
    window.angular.resumeDeferredBootstrap()

    expect(beforeBootstrap).toHaveBeenCalled()
    expect(resumeBootstrapCalled).toBe(true)
    expect(bootstrapCalled).toBe(true)
  })

  afterEach(function () {
    // Clean up side effects
    delete window.angular
    window.angular = originalAngular
    window.name = ''
  })
})
