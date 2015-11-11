var Promise = require('es6-promise').Promise
var stackTrace = require('./stacktrace')
var frames = require('./frames')

var Exceptions = function () {

}

Exceptions.prototype.install = function () {
  window.onerror = function (msg, file, line, col, error) {
    processError.call(this, error, msg, file, line, col)
  }.bind(this)
}

Exceptions.prototype.uninstall = function () {
  window.onerror = null
}

Exceptions.prototype.processError = function (err) {
  processError(err)
}

function processError (error, msg, file, line, col) {
  if (msg === 'Script error.' && !file) {
    // ignoring script errors: See https://github.com/getsentry/raven-js/issues/41
    return
  }

  var exception = {
    'message': error ? error.message : msg,
    'type': error ? error.name : null,
    'fileurl': file || null,
    'lineno': line || null,
    'colno': col || null
  }

  if (!exception.type) {
    // Try to extract type from message formatted like 'ReferenceError: Can't find variable: initHighlighting'
    if (exception.message.indexOf(':') > -1) {
      exception.type = exception.message.split(':')[0]
    }
  }

  var resolveStackFrames

  if (error) {
    resolveStackFrames = stackTrace.fromError(error)
  } else {
    resolveStackFrames = new Promise(function (resolve, reject) {
      resolve([{
        'fileName': file,
        'lineNumber': line,
        'columnNumber': col
      }])
    })
  }

  resolveStackFrames.then(function (stackFrames) {
    exception.stack = stackFrames || []
    return frames.stackInfoToOpbeatException(exception).then(function (exception) {
      frames.processOpbeatException(exception)
    })
  })['catch'](function () {})
}

module.exports = Exceptions
