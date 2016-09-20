var stackTrace = require('./stacktrace')
var frames = require('./frames')

var ExceptionHandler = function (opbeatBackend, config, logger) {
  this._opbeatBackend = opbeatBackend
  this._config = config
  this._logger = logger
}

ExceptionHandler.prototype.install = function () {
  window.onerror = function (msg, file, line, col, error) {
    this._processError(error, msg, file, line, col)
  }.bind(this)
}

ExceptionHandler.prototype.uninstall = function () {
  window.onerror = null
}

ExceptionHandler.prototype.processError = function (err) {
  return this._processError(err)
}

ExceptionHandler.prototype._processError = function processError (error, msg, file, line, col) {
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

  var exceptionHandler = this
  return resolveStackFrames.then(function (stackFrames) {
    exception.stack = stackFrames || []
    return frames.stackInfoToOpbeatException(exception).then(function (exception) {
      var data = frames.processOpbeatException(exception, exceptionHandler._config.get('context.user'), exceptionHandler._config.get('context.extra'))
      exceptionHandler._opbeatBackend.sendError(data)
    })
  })['catch'](function (error) {
    exceptionHandler._logger.debug(error)
  })
}

module.exports = ExceptionHandler
