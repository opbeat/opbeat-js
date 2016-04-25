var TransactionService = require('../../src/transaction/transaction_service')
var Transaction = require('../../src/transaction/transaction')

var logger = require('loglevel')

function ZoneServiceMock () {
  this.transaction = undefined
  this.getCurrentTransaction = function () {
    return this.transaction
  }
}

describe('TransactionService', function () {
  var transactionService
  var zoneServiceMock
  beforeEach(function () {
    zoneServiceMock = new ZoneServiceMock()

    spyOn(zoneServiceMock, 'getCurrentTransaction').and.callThrough()
    spyOn(logger, 'debug')
    transactionService = new TransactionService(zoneServiceMock, logger, {})
  })

  it('should not start trace when there is no current transaction', function () {
    transactionService.startTrace('test-trace', 'test-trace')
    expect(logger.debug).toHaveBeenCalled()
  })

  it('should call startTrace on current Transaction', function () {
    var tr = new Transaction('transaction', 'transaction')
    spyOn(tr, 'startTrace').and.callThrough()
    zoneServiceMock.transaction = tr
    transactionService.startTrace('test-trace', 'test-trace')
    expect(zoneServiceMock.transaction.startTrace).toHaveBeenCalledWith('test-trace', 'test-trace', undefined)
  })
})
