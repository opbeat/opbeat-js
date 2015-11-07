var utils = require('../utils')

module.exports = function($provide) {
  
  // $httpBackend instrumentation
  $provide.decorator('$httpBackend', function ($delegate, $injector) {
    var $rootScope = $injector.get('$rootScope')
    var $location = $injector.get('$location')

    return function () {
      var args = Array.prototype.slice.call(arguments)
      var transaction = $rootScope._opbeatTransactions && $rootScope._opbeatTransactions[$location.absUrl()]

      var result = utils.instrumentMethodWithCallback($delegate, '$httpBackend', transaction, 'app.httpBackend', {
        prefix: '$httpBackend',
        callbackIndex: 3,
        signatureFormatter: function (key, args) {
          var text = ['$httpBackend', args[0].toUpperCase(), args[1]]
          return text.join(' ')
        }
      }).apply(this, args)

      return result
    }
  })
  
}