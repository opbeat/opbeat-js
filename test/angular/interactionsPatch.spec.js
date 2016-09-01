var patchInteractions = require('../../src/angular/patches/interactionsPatch')
var TransactionService = require('../../src/transaction/transaction_service')
var logger = require('loglevel')
var ZoneServiceMock = require('../transaction/zone_service_mock')
var Config = require('../../src/lib/config')

describe('interactionsPatch', function () {
  var angular, app, config, injector, trService

  beforeEach(function () {
    angular = window.angular
    app = angular.module('patchModule', ['ng'])
    config = Object.create(Config)
    config.init()

    trService = new TransactionService(new ZoneServiceMock(), logger, config)
    spyOn(trService, 'startTransaction')

    app.config(function ($provide) {
      patchInteractions($provide, trService)
    })
    injector = angular.injector(['patchModule'])
  })

  it('should work with ngClick', function () {
    injector.invoke(function ($compile, $rootScope) {
      var scope = $rootScope
      var actionSpy = scope.action = jasmine.createSpy('actionSpy')
      var element = $compile('<div ng-click="action()"></div>')(scope)
      scope.$digest()

      expect(actionSpy).not.toHaveBeenCalled()

      var eventType = 'click'
      browserTrigger(element, eventType)

      expect(actionSpy).toHaveBeenCalled()
      expect(trService.startTransaction).toHaveBeenCalledWith('ngClick: action()', 'interaction')
    })
  })

  it('should work with ngSubmit', function () {
    injector.invoke(function ($compile, $rootScope) {
      $rootScope.formSubmission = function (e) {
        if (e) {
          $rootScope.formSubmitted = 'foo'
        }
      }

      var element = $compile('<form action="/foo" ng-submit="formSubmission($event)">' +
        '<input type="submit"/>' +
        '</form>')($rootScope)
      $rootScope.$digest()

      // prevent submit within the test harness
      element.on('submit', function (e) { e.preventDefault() })

      expect($rootScope.formSubmitted).not.toBeDefined()

      browserTrigger(element.children()[0], 'click')
      expect($rootScope.formSubmitted).toEqual('foo')
    })
  })
})

function browserTrigger (element, eventType) {
  if (element && !element.nodeName) element = element[0]

  var evnt = document.createEvent('MouseEvents')
  var x = x || 0
  var y = y || 0
  evnt.initMouseEvent(eventType, true, true, window, 0, x, y, x, y, /* pressed('ctrl')*/ false,
  /* pressed('alt')*/ false, /* pressed('shift')*/ false, /* pressed('meta')*/ false, 0, element[0])

  element.dispatchEvent(evnt)
}
