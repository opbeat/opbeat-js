var Promise = require('bluebird')
var stackTrace = require('./stacktrace')
var frames = require('./frames')

var Exceptions = function () {

}

Exceptions.prototype.install =function () {
  window.onerror = function (msg, file, line, col, error) {
    processWindowError.call(this, msg, file, line, col, error)
  }.bind(this)
}

Exceptions.prototype.uninstall = function () {
	window.onerror = null
}

Exceptions.prototype.processError = function(err) {
  var resolveStackFrames

  if (err.stack) {
    resolveStackFrames = stackTrace.fromError(err)
  } else {
    resolveStackFrames = Promise.resolve()
  }

  resolveStackFrames.then(function (stackFrames) {
    var exception = {
      'message': err.message,
      'type': err.name,
      'stack': stackFrames
    }

    frames.stackInfoToOpbeatException(exception).then(function (exception) {
      frames.processException(exception)
    }.bind(this))

  }.bind(this)).caught(function () {})

}

function processWindowError(msg, file, line, col, error) {

  if(msg === "Script error." && !file) {
    // ignoring script errors: See https://github.com/getsentry/raven-js/issues/41
    return
  }

  var exception = {
    'message': error ? error.message : msg,
    'type': error ? error.name : '',
    'fileurl': file,
    'lineno': line,
    'colno': col,
  }

  var resolveStackFrames
  if (error) {
    resolveStackFrames = stackTrace.fromError(error)
  } else {
    resolveStackFrames = new Promise(function (resolve, reject) {
      resolve([{
        'fileName': file,
        'lineNumber': line,
        'columnNumber': col,
      }])
    })
  }

  resolveStackFrames.then(function (stackFrames) {
    exception.stack = stackFrames || []
    return frames.stackInfoToOpbeatException(exception).then(function (exception) {
      frames.processException(exception)
    })

  }).caught(function () {})

}

module.exports = Exceptions
