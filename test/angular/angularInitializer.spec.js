var ZoneServiceMock = require('../transaction/zone_service_mock.js')
var angularInitializer = require('../../src/angular/angularInitializer')

var ServiceContainer = require('../../src/common/serviceContainer')
var ServiceFactory = require('../../src/common/serviceFactory')

var Config = require('../../src/lib/config')

describe('angularInitializer', function () {
  var originalAngular
  var zoneService
  var serviceContainer

  beforeEach(function () {
    originalAngular = window.angular
    var serviceFactory = new ServiceFactory()
    var config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config
    serviceContainer = new ServiceContainer(serviceFactory)
    zoneService = new ZoneServiceMock()
    serviceContainer.services.zoneService = zoneService
  })

  it('should inject with ngMock', function () {
    angularInitializer(serviceContainer)
    window.angular.module('test', ['ngOpbeat'])
    window.angular.injector(['ng', 'test'])

    window.inject(function ($location) {
      expect(typeof $location.url).toBe('function')
    })
  })

  it('should register after angular is loaded', function () {
    window.angular.module('test', ['ngOpbeat'])
    window.angular = undefined
    angularInitializer(serviceContainer)

    var bootstrapIsCalled = false
    var fakeAngular = window.angular = {
      bootstrap: function (element, modules) {
        originalAngular.injector(['ng', 'test'])
        bootstrapIsCalled = true
      },
      module: originalAngular.module.bind(originalAngular),
      version: {
        full: 'fullversion'
      }
    }
    fakeAngular.bootstrap('<div></div>', ['test'])
    expect(bootstrapIsCalled).toBeTruthy()
  })

  afterEach(function () {
    // Clean up side effects
    delete window.angular
    window.angular = originalAngular
    window.name = ''
    window.angular.module('ngOpbeat', ['non-existing-module'])
  })
})
