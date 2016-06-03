var ZoneServiceMock = require('../transaction/zone_service_mock')

describe('ngOpbeat', function () {
  var Config = require('../../src/lib/config')
  var logger = require('loglevel')
  var TransactionService = require('../../src/transaction/transaction_service')
  var ngOpbeat = require('../../src/angular/ngOpbeat')
  var ZoneServiceMock = require('../transaction/zone_service_mock.js')

  var config

  var zoneServiceMock

  beforeEach(function () {
    config = Object.create(Config)
    config.init()
    spyOn(logger, 'debug')

    zoneServiceMock = new ZoneServiceMock()
  })

  it('should not start transactions if performance is disable', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true, performance: {enable: false}})
    expect(config.isValid()).toBe(true)
    expect(config.get('performance.enable')).toBe(false)

    var angular = window.angular
    angular.module('patchModule', ['ngOpbeat'])
    var trService = new TransactionService(zoneServiceMock, logger, {})
    spyOn(trService, 'startTrace')

    ngOpbeat(trService, logger, config)
    var injector = angular.bootstrap('<div></div>', ['patchModule'])
    injector.invoke(function ($rootScope) {
      $rootScope.$broadcast('$routeChangeStart')
      expect(logger.debug).toHaveBeenCalledWith('Performance monitoring is disable')
    })
  })
})
