var Transaction = require('../../src/instrumentation/transaction')

var InstrumentationMock = function () {
  this._queue = []
  this.add = function (transaction) {
    this._queue.push(transaction)
  }
  this.startTransaction = function (name, type, options) {
    return new Transaction(this, name, type, options)
  }
}

module.exports = InstrumentationMock
