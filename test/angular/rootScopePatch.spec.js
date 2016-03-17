var patchRootScope = require('../../src/angular/rootScopePatch')
var TransactionService = require('../../src/transaction/transaction_service')
var logger = require('loglevel')

describe('angular.rootScopePatch', function () {
  it('should call startTrace for $scope.$digest', function () {
    var angular = window.angular
    var app = angular.module('patchModule', ['ng'])
    var trService = new TransactionService(logger, {})
    spyOn(trService, 'startTrace')

    app.config(function ($provide) {
      patchRootScope($provide, trService)
    })
    var injector = angular.injector(['patchModule'])

    trService.startTransaction('transaction', 'transaction', {})

    var rootScope = injector.get('$rootScope')
    rootScope.$digest()
    expect(trService.startTrace).toHaveBeenCalledWith('$scope.$digest', '$scope.$digest')
  })
})
