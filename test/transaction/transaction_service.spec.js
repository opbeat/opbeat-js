var TransactionService = require('../../src/transaction/transaction_service')
var Transaction = require('../../src/transaction/transaction')

var ZoneServiceMock = require('./zone_service_mock.js')
var logger = require('loglevel')

var Config = require('../../src/lib/config')

describe('TransactionService', function () {
  var transactionService
  var zoneServiceMock
  beforeEach(function () {
    zoneServiceMock = new ZoneServiceMock()

    spyOn(zoneServiceMock, 'get').and.callThrough()
    spyOn(logger, 'debug')

    var config = Object.create(Config)
    config.init()
    transactionService = new TransactionService(zoneServiceMock, logger, config)
  })

  it('should not start trace when there is no current transaction', function () {
    transactionService.startTrace('test-trace', 'test-trace')
    expect(logger.debug).toHaveBeenCalled()
  })

  it('should call startTrace on current Transaction', function () {
    var tr = new Transaction('transaction', 'transaction')
    spyOn(tr, 'startTrace').and.callThrough()
    zoneServiceMock.zone.transaction = tr
    transactionService.startTrace('test-trace', 'test-trace')
    expect(zoneServiceMock.zone.transaction.startTrace).toHaveBeenCalledWith('test-trace', 'test-trace', undefined)
  })
})
