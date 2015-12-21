var config = require('./config')

var logStack = []

module.exports = {
  getLogStack: function () {
    return logStack
  },

  error: function(msg, data) {
    return this.log('%c' + msg, 'color: red', data)
  },

  warning: function(msg, data) {
    return this.log('%c' + msg, 'background-color: ffff00', data)
  },

  log: function (message, data) {
    // Optimized copy of arguments (V8 https://github.com/GoogleChrome/devtools-docs/issues/53#issuecomment-51941358)
    var args = new Array(arguments.length)
    for (var i = 0, l = arguments.length; i < l; i++) {
      args[i] = arguments[i]
    }

    var isDebugMode = config.get('debug') === true || config.get('debug') === 'true'
    var hasConsole = window.console

    logStack.push({
      msg: message,
      data: args.slice(1)
    })

    if (isDebugMode && hasConsole) {
      window.console.log.apply(window.console, args)
    }
  }
}
