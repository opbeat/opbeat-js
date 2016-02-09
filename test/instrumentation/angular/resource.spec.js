var Config = require('../../../src/lib/config')
require('jasmine-ajax')
var InstrumentationMock = require('../../utils/instrumentation_mock')
var TransactionStoreMock = require('../../utils/transaction_store_mock')
var proxyquire = require('proxyquireify')(require)

var config = {
  config: {isInstalled: true},
  init: function () { this.setConfig({isInstalled: true}) },
  '@runtimeGlobal': true
}

Object.setPrototypeOf(config, Config)

config.init()

var instrumentation = new InstrumentationMock()

var transactionStore = new TransactionStoreMock(instrumentation)
var mainTr = instrumentation.startTransaction('/', 'transaction', { config: config })
transactionStore.setTransaction(mainTr)

var resourcePatch = proxyquire('../../../src/instrumentation/angular/resource', {
  './instrumentation': instrumentation,
  './lib/config': config,
  '../lib/config': config,
  '../utils': {'@runtimeGlobal': true},
  './transactionStore': transactionStore
})

describe('instrumentation.angular.resource', function () {
  beforeEach(function () {
    jasmine.Ajax.install()
  })

  it('should contain the right url for $resource.get', function (done) {
    var angular = window.angular
    var app = angular.module('resourcePatchModule', ['ngResource'])
    app.config(function ($provide) {
      resourcePatch($provide)
    })

    var injector = angular.injector(['resourcePatchModule'])
    var $resource = injector.get('$resource')('/api/:userId', {userId: '@id'})
    $resource.get('/api/1')

    $resource.get({userId: 'userId'})
    mainTr.end()
    setTimeout(function () {
      var traces = instrumentation._queue[0].traces.map(function (t) { return t.signature })
      expect(traces).toContain('transaction')
      expect(traces).toContain('$resource GET /api/1')
      expect(traces).toContain('$resource GET /api/:userId')
      done()
    // console.log(traces)
    }, 100)
  })

  afterEach(function () {
    jasmine.Ajax.uninstall()
  })
})
