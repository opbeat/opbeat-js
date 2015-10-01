var config = require('./config')

module.exports = {
  log: function (message, data) {
    var isDebugMode = config.get('debug') == 'true'
    var hasConsole = window.console


    if (isDebugMode && hasConsole) {
      window.console.log(message, data)
    }

  }
}
