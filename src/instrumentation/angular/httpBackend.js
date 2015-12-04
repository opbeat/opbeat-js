var utils = require('../utils')
var transactionStore = require('../transactionStore')

module.exports = function ($provide) {
  // $httpBackend instrumentation
  $provide.decorator('$httpBackend', ['$delegate', '$injector', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var transaction = transactionStore.getRecentByUrl($injector.get('$location').absUrl())

      var result = utils.instrumentMethodWithCallback($delegate, '$httpBackend', transaction, 'ext.$httpBackend', {
        prefix: '$httpBackend',
        callbackIndex: 3,
        signatureFormatter: function (key, args) {
          var text = ['$httpBackend', args[0].toUpperCase(), args[1]]
          return text.join(' ')
        }
      }).apply(this, args)
      return result
    }
  }])
}
