var patchDirectives = require('../../src/angular/patches/directivesPatch')
var TransactionService = require('../../src/transaction/transaction_service')
var logger = require('loglevel')
var ZoneServiceMock = require('../transaction/zone_service_mock')

var Config = require('../../src/lib/config')

describe('angular.directivesPatch', function () {
  var angular, app, config
  beforeEach(function () {
    angular = window.angular
    app = angular.module('patchModule', ['ng'])
    config = Object.create(Config)
    config.init()
  })
  it('should call startTrace for ngRepeat $watchCollection action', function () {
    var trService = new TransactionService(new ZoneServiceMock(), logger, config)
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
      scope.items = [{ name: 'hamid' }, { name: 'reza' }]
      scope.$digest()
      expect(element.find('li').length).toEqual(2)
      expect(element.text()).toEqual('hamid;reza;')
      expect(trService.startTrace).toHaveBeenCalledWith('ngRepeat items[2]', 'template.ngRepeat', { 'enableStackFrames': false })

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
      expect(trService.startTrace).toHaveBeenCalledWith('ngRepeat arrayFn()[2]', 'template.ngRepeat', { 'enableStackFrames': false })

      // an object
      element = $compile(
        '<ul>' +
        '<li ng-repeat="item in obj">{{item}};</li>' +
        '</ul>')(scope)

      scope.obj = { key1: 'hamid', key2: 'reza' }
      scope.$digest()
      expect(element.find('li').length).toEqual(2)
      expect(element.text()).toEqual('hamid;reza;')
      expect(trService.startTrace).toHaveBeenCalledWith('ngRepeat obj', 'template.ngRepeat', { 'enableStackFrames': false })

      // undefined
      element = $compile(
        '<ul>' +
        '<li ng-repeat="item in justUndefined">{{item}};</li>' +
        '</ul>')(scope)

      scope.$digest()
      expect(element.find('li').length).toEqual(0)
      expect(element.text()).toEqual('')
      expect(trService.startTrace).toHaveBeenCalledWith('ngRepeat justUndefined', 'template.ngRepeat', { 'enableStackFrames': false })
    })
  })

  // it('should work for ngEvent', function () {
  //   var trService = new TransactionService(new ZoneServiceMock(), logger, config)
  //   spyOn(trService, 'startTransaction')

  //   app.config(function ($provide) {
  //     patchDirectives($provide, trService)
  //   })
  //   var injector = angular.injector(['patchModule'])
  //   injector.invoke(function ($compile, $rootScope) {
  //     var scope = $rootScope
  //     scope.action = function () {}
  //     var element = $compile('<div ng-click="action()"></div>')(scope)
  //     scope.$digest()
  //     // element.click()

  //     // function pressed () {
  //     //   return false
  //     // }
  //     var eventType = 'click'
  //     var evnt = document.createEvent('MouseEvents')
  //     var x = x || 0
  //     var y = y || 0
  //     evnt.initMouseEvent(eventType, true, true, window, 0, x, y, x, y, /* pressed('ctrl')*/ false,
  //      /* pressed('alt')*/ false,/* pressed('shift')*/ false,/* pressed('meta')*/ false, 0, element[0])

//     // expect(element.find('li').length).toEqual(2)
//     // expect(element.text()).toEqual('hamid;reza;')
//     expect(trService.startTransaction).toHaveBeenCalledWith('ngClick: action()', 'transaction')
//   })
// })
})
