var utils = require('../instrumentation/utils')

module.exports = function ($provide, traceBuffer) {
  // Template Compile Instrumentation
  $provide.decorator('$compile', ['$delegate', '$injector', function ($delegate, $injector) {
    var options = {
      type: 'template.$compile',
      prefix: '$compile',
      instrumentConstructor: true,
      traceBuffer: traceBuffer,
      instrumentObjectFunctions: false
    }
    return utils.instrumentModule($delegate, $injector, options)
  }])
}
