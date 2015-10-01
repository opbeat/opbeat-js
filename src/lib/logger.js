var config = require('./config')

var logStack = []

module.exports = {
  getLogStack: function () {
    return logStack
  },

  log: function (message, data) {
    var isDebugMode = config.get('debug') == 'true'
    var hasConsole = window.console

    logStack.push({
      msg: message,
      data: data
    })

    if (isDebugMode && hasConsole) {
      window.console.log(message, data)
    }

  }
}
