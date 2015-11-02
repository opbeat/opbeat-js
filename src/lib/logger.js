var config = require('./config')

var logStack = []

module.exports = {
  getLogStack: function () {
    return logStack
  },

  log: function (message, data) {
    var args = Array.prototype.slice.call(arguments)

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
