describe('ngOpbeat', function () {
  var Config = require('../../src/lib/config')
  var TransactionService = require('../../src/transaction/transaction_service')
  var ngOpbeat = require('../../src/angular/ngOpbeat')
  var ServiceContainer = require('../../src/common/serviceContainer')
  var ZoneServiceMock = require('../transaction/zone_service_mock.js')
  var ServiceFactory = require('../../src/common/serviceFactory')

  var config

  var zoneServiceMock
  var logger
  var serviceContainer
  var transactionService
  var exceptionHandler
  beforeEach(function () {
    var serviceFactory = new ServiceFactory()
    config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config
    serviceFactory.services['Logger'] = logger = Object.create(serviceFactory.getLogger())
    spyOn(logger, 'debug')
    serviceContainer = new ServiceContainer(serviceFactory)

    zoneServiceMock = new ZoneServiceMock()
    serviceContainer.services.zoneService = zoneServiceMock

    transactionService = new TransactionService(zoneServiceMock, logger, {})
    serviceContainer.services.transactionService = transactionService

    exceptionHandler = serviceFactory.getExceptionHandler()
    serviceContainer.services.exceptionHandler = exceptionHandler

    spyOn(transactionService, 'startTrace')

    window.angular.module('patchModule', ['ngOpbeat'])
      .config(function ($provide) {
        $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
          return function $ExceptionHandler (exception, cause) {
            fail(exception)
            return $delegate(exception, cause)
          }
        }])
      })
  })

  it('should not start transactions if performance is disable', function () {
    ngOpbeat(transactionService, logger, config, exceptionHandler)
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true, performance: {enable: false}})
    expect(config.isValid()).toBe(true)
    expect(config.get('performance.enable')).toBe(false)

    var angular = window.angular

    var injector = angular.bootstrap('<div></div>', ['patchModule'])
    injector.invoke(function ($rootScope) {
      $rootScope.$broadcast('$routeChangeStart')
      expect(logger.debug).toHaveBeenCalledWith('Performance monitoring is disable')
    })
  })

  it('should set correct log level', function () {
    ngOpbeat(transactionService, logger, config, exceptionHandler)
    expect(config.get('debug')).toBe(false)
    expect(config.get('logLevel')).toBe('warn')
    expect(logger.getLevel()).toBe(logger.levels.WARN)

    var angular = window.angular
    angular.module('patchModule')
      .config(function ($opbeatProvider) {
        $opbeatProvider.config({debug: true})
        expect(logger.getLevel()).toBe(logger.levels.DEBUG)

        $opbeatProvider.config({debug: true, logLevel: 'trace'})
        expect(logger.getLevel()).toBe(logger.levels.TRACE)

        $opbeatProvider.config({debug: false, logLevel: 'warn'})
        expect(logger.getLevel()).toBe(logger.levels.WARN)
      })

    angular.bootstrap('<div></div>', ['patchModule'])
  })

  it('should consider isPlatformSupported', function () {
    serviceContainer.services.transactionService = undefined
    serviceContainer.services.configService.isPlatformSupported = function () {
      return false
    }
    ngOpbeat(transactionService, logger, config, exceptionHandler)

    var angular = window.angular
    angular.module('patchModule')
      .config(function ($provide, $opbeatProvider) {
        $opbeatProvider.config({appId: 'test'})
        expect(config.get('appId')).toBe('test')
      })

    var injector = angular.bootstrap('<div></div>', ['patchModule'])
    injector.invoke(function ($rootScope) {
      $rootScope.$broadcast('$routeChangeStart')
    })
  })

  xit('should consider if AngularJS is supported', function () {
    serviceContainer.services.transactionservice = undefined

    ngOpbeat(transactionService, logger, config, exceptionHandler)
    var angular = window.angular
    angular.module('patchModule')
      .config(function ($opbeatProvider) {
        $opbeatProvider.config({appId: 'test'})
        expect(config.get('appId')).toBe('test')
      })

    var injector = angular.bootstrap('<div></div>', ['patchModule'])
    injector.invoke(function ($rootScope) {
      $rootScope.$broadcast('$routeChangeStart')
    })
  })
})
