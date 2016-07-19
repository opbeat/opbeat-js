describe('ngOpbeat', function () {
  var Config = require('../../src/lib/config')
  var TransactionService = require('../../src/transaction/transaction_service')
  var ngOpbeat = require('../../src/angular/ngOpbeat')
  var ZoneServiceMock = require('../transaction/zone_service_mock.js')
  var ServiceFactory = require('../../src/common/serviceFactory')

  var config

  var zoneServiceMock
  var logger
  beforeEach(function () {
    var serviceFactory = new ServiceFactory()
    config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config
    serviceFactory.services['Logger'] = logger = Object.create(serviceFactory.getLogger())
    spyOn(logger, 'debug')

    zoneServiceMock = new ZoneServiceMock()

    var trService = new TransactionService(zoneServiceMock, logger, {})
    spyOn(trService, 'startTrace')

    ngOpbeat(trService, logger, config)
  })

  it('should not start transactions if performance is disable', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true, performance: {enable: false}})
    expect(config.isValid()).toBe(true)
    expect(config.get('performance.enable')).toBe(false)

    var angular = window.angular
    angular.module('patchModule', ['ngOpbeat'])

    var injector = angular.bootstrap('<div></div>', ['patchModule'])
    injector.invoke(function ($rootScope) {
      $rootScope.$broadcast('$routeChangeStart')
      expect(logger.debug).toHaveBeenCalledWith('Performance monitoring is disable')
    })
  })

  it('should set correct log level', function () {
    expect(config.get('debug')).toBe(false)
    expect(config.get('logLevel')).toBe('warn')
    expect(logger.getLevel()).toBe(logger.levels.WARN)

    var angular = window.angular
    angular.module('patchModule', ['ngOpbeat']).config(function ($opbeatProvider) {
      $opbeatProvider.config({debug: true})
      expect(logger.getLevel()).toBe(logger.levels.DEBUG)

      $opbeatProvider.config({debug: true, logLevel: 'trace'})
      expect(logger.getLevel()).toBe(logger.levels.TRACE)

      $opbeatProvider.config({debug: false, logLevel: 'warn'})
      expect(logger.getLevel()).toBe(logger.levels.WARN)
    })

    angular.bootstrap('<div></div>', ['patchModule'])
  })
})
