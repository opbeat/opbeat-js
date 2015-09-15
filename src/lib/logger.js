module.exports = {
  log: function (message, data) {
    if (window.console && window.console.log) {
      window.console.log(message, data)
    }
  }
}
