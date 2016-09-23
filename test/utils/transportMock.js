var Subscription = require('../../src/common/subscription')

function TransportMock (transport) {
  this._transport = transport
  this.transactions = []
  this.subscription = new Subscription()
  this.errors = []
}

TransportMock.prototype.sendTransaction = function (transactions) {
  this.transactions = this.transactions.concat(transactions)
  var trMock = this
  if (this._transport) {
    this._transport.sendTransaction(transactions).then(function () {
      trMock.subscription.applyAll(this, ['sendTransaction', transactions])
    }, function (reason) {
      console.log('Failed to send to opbeat: ', reason)
    })
  } else {
    this.subscription.applyAll(this, ['sendTransaction', transactions])
  }
}

TransportMock.prototype.subscribe = function (fn) {
  return this.subscription.subscribe(fn)
}

TransportMock.prototype.sendError = function (data, headers) {
  var errorData = {data: data, headers: headers}
  this.errors.push(errorData)
  this.subscription.applyAll(this, ['sendError', errorData])
}

module.exports = TransportMock
