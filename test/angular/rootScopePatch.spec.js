var patchRootScope = require('../../src/angular/rootScopePatch')
var TransactionService = require('../../src/transaction/transaction_service')
var logger = require('loglevel')
var ZoneServiceMock = require('../transaction/zone_service_mock')

var Config = require('../../src/lib/config')


describe('angular.rootScopePatch', function () {
  it('should call startTrace for $scope.$digest', function () {
    var angular = window.angular
    var app = angular.module('patchModule', ['ng'])

    var config = Object.create(Config)
    config.init()
    var trService = new TransactionService(new ZoneServiceMock(), logger, config)
    spyOn(trService, 'startTrace')

    app.config(function ($provide) {
      patchRootScope($provide, trService)
    })
    var injector = angular.injector(['patchModule'])

    trService.startTransaction('transaction', 'transaction', {})

    var rootScope = injector.get('$rootScope')
    rootScope.$digest()
    expect(trService.startTrace).toHaveBeenCalledWith('$scope.$digest', 'app.$digest', { 'enableStackFrames': false })
  })
})
