function TransactionStoreMock (instrumentation) {
  var tr = null
  this.getRecentByUrl = function () {
    return tr
  }
  this.setTransaction = function (transaction) {
    tr = transaction
  }
}

module.exports = TransactionStoreMock
