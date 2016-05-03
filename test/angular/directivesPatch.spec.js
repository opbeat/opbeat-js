var patchDirectives = require('../../src/angular/directivesPatch')
var TransactionService = require('../../src/transaction/transaction_service')
var logger = require('loglevel')

describe('angular.directivesPatch', function () {
  it('should call startTrace for ngRepeat $watchCollection action', function () {
    var angular = window.angular
    var app = angular.module('patchModule', ['ng'])
    var trService = new TransactionService({}, logger, {performance: {enableStackFrames: true}})
    spyOn(trService, 'startTrace')

    app.config(function ($provide) {
      patchDirectives($provide, trService)
    })
    var injector = angular.injector(['patchModule'])

    trService.startTransaction('transaction', 'transaction')

    injector.invoke(function ($compile, $rootScope) {
      // an array
      var scope = $rootScope
      var element = $compile(
        '<ul>' +
        '<li ng-repeat="item in items">{{item.name}};</li>' +
        '</ul>')(scope)
      scope.items = [{name: 'hamid'}, {name: 'reza'}]
      scope.$digest()
      expect(element.find('li').length).toEqual(2)
      expect(element.text()).toEqual('hamid;reza;')
      expect(trService.startTrace).toHaveBeenCalledWith('ngRepeat items[2]', 'template.ngRepeat', {performance: { 'enableStackFrames': false }})

      // a function
      element = $compile(
        '<ul>' +
        '<li ng-repeat="item in arrayFn()">{{item.name}};</li>' +
        '</ul>')(scope)

      scope.arrayFn = function () {
        return scope.items
      }
      scope.$digest()
      expect(element.find('li').length).toEqual(2)
      expect(element.text()).toEqual('hamid;reza;')
      expect(trService.startTrace).toHaveBeenCalledWith('ngRepeat arrayFn()[2]', 'template.ngRepeat', {performance: { 'enableStackFrames': false }})

      // an object
      element = $compile(
        '<ul>' +
        '<li ng-repeat="item in obj">{{item}};</li>' +
        '</ul>')(scope)

      scope.obj = {key1: 'hamid', key2: 'reza'}
      scope.$digest()
      expect(element.find('li').length).toEqual(2)
      expect(element.text()).toEqual('hamid;reza;')
      expect(trService.startTrace).toHaveBeenCalledWith('ngRepeat obj', 'template.ngRepeat', {performance: { 'enableStackFrames': false }})

      // undefined
      element = $compile(
        '<ul>' +
        '<li ng-repeat="item in justUndefined">{{item}};</li>' +
        '</ul>')(scope)

      scope.$digest()
      expect(element.find('li').length).toEqual(0)
      expect(element.text()).toEqual('')
      expect(trService.startTrace).toHaveBeenCalledWith('ngRepeat justUndefined', 'template.ngRepeat', {performance: { 'enableStackFrames': false }})
    })
  })
})
