var logLevels = {
  ALL: {value: Number.MIN_VALUE},
  DEBUG: {value: 700},
  INFO: {value: 800},
  WARNING: {value: 900},
  SEVERE: {value: 1000},
  OFF: {value: Number.MAX_VALUE}
}
module.exports = {
  verifyNoBrowserErrors: function (done) {
    // TODO: Bug in ChromeDriver: Need to execute at least one command
    // so that the browser logs can be read out!
    browser.execute('1+1')
    browser.log('browser').then(function (response) {
      var filteredLog = []
      var browserLog = response.value
      for (var i = 0; i < browserLog.length; i++) {
        var logEntry = browserLog[i]
        if (logLevels[logEntry.level].value > logLevels.WARNING.value) {
          filteredLog.push(logEntry)
        } else if (logLevels[logEntry.level].value >= logLevels.INFO.value) {
          console.log('>> ' + logEntry.message)
        }
      }
      console.log(filteredLog)
      expect(filteredLog.length).toEqual(0, 'Expected no errors in the browserLog but got ' + filteredLog.length + ' error(s)') // .because()
      if (typeof done === 'function') {
        done()
      }
    })
  }
}
