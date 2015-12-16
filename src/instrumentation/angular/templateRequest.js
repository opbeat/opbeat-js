var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  try {
    // Template Request Instrumentation
    $provide.decorator('$templateRequest', ['$delegate', '$injector', function ($delegate, $injector) {
      return utils.instrumentModule($delegate, $injector, {
        type: 'template.$templateRequest',
        prefix: '$templateRequest',
        traceBuffer: traceBuffer,
        instrumentConstructor: true,
        signatureFormatter: function (key, args) {
          var text = ['$templateRequest', args[0]]
          return text.join(' ')
        }
      })
    }])
  } catch (e) {}
}
