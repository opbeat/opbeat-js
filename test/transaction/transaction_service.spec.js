var TransactionService = require('../../src/transaction/transaction_service')
var logger = require('loglevel')

describe('TransactionService', function () {
  var transactionService
  beforeEach(function () {
    transactionService = new TransactionService(logger, {})
  })

  it('should start global transaction', function () {
    var firstId = transactionService.startGlobalTransaction('transaction', 'transaction', {})
    expect(transactionService.globalTransactionId).toBe(firstId)
    var secondId = transactionService.startGlobalTransaction('transaction', 'transaction', {})

    expect(transactionService.globalTransactionId).toBe(secondId)
    expect(transactionService.transactions[firstId].ended).toBe(false)
    expect(transactionService.transactions[secondId].ended).toBe(false)

    transactionService.endTransaction(firstId)
    expect(transactionService.transactions[firstId].ended).toBe(true)
    expect(transactionService.transactions[secondId].ended).toBe(false)
    expect(transactionService.globalTransactionId).toBe(secondId)

    var thirdId = transactionService.startTransaction('transaction', 'transaction', {})
    expect(transactionService.globalTransactionId).toBe(secondId)
    expect(transactionService.transactions[thirdId].ended).toBe(false)

    transactionService.endTransaction(secondId)
    expect(transactionService.transactions[secondId].ended).toBe(true)
    expect(transactionService.globalTransactionId).toBe(null)
  })

  it('should end global transaction', function () {
    var id = transactionService.startGlobalTransaction('transaction', 'transaction', {})
    expect(transactionService.globalTransactionId).toBe(id)
    transactionService.endTransaction(id)
    expect(transactionService.transactions[id].ended).toBe(true)
    expect(transactionService.globalTransactionId).toBe(null)
  })
})
