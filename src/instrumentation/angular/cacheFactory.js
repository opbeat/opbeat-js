var utils = require('../utils')

module.exports = function ($provide, traceBuffer) {
  // $cacheFactory instrumentation (this happens before routeChange -> using traceBuffer)
  $provide.decorator('$cacheFactory', ['$delegate', '$injector', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      traceBuffer: traceBuffer,
      prefix: function (args) {
        if (args.length) {
          return args[0] + 'Cache'
        } else {
          return 'cacheFactory'
        }
      },
      type: function () {
        return 'cache.' + this.prefix
      },
      signatureFormatter: function (key, args, options) {
        return ['$' + options.prefix, key.toUpperCase(), args[0]].join(' ')
      }
    })
  }])
}
