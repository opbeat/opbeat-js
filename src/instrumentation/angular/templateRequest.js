var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  // Template Request Instrumentation
  $provide.decorator('$templateRequest', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'template.angular.request',
      prefix: '$templateRequest',
      signatureFormatter: function (key, args) {
        var text = ['$templateRequest', args[0]]
        return text.join(' ')
      }
    })
  })
}
