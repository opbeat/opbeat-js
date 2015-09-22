var logger = require('./logger')
var config = require('./config')
var transport = require('./transport')
var utils = require('./utils')
var Promise = require('bluebird')
var stackTrace = require('./stacktrace')

module.exports = {
  install: function () {
    window.onerror = function (msg, file, line, col, error) {
      this.processWindowError(msg, file, line, col, error)
    }.bind(this)
  },

  uninstall: function () {
    window.onerror = null
  },

  processError: function (err) {
    var that = this

    stackTrace.fromError(err).then(function (stackFrames) {
      var exception = {
        'message': err.message,
        'type': err.name,
        'stack': stackFrames
      }

      that.stackInfoToOpbeatException(exception).then(function (exception) {
        that.processException(exception)
      })

    }).caught(function () {})

  },

  processWindowError: function (msg, file, line, col, error) {
    var that = this
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
      return that.stackInfoToOpbeatException(exception).then(function (exception) {
        that.processException(exception)
      })
    }).caught(function () {})

  },

  buildOpbeatFrame: function buildOpbeatFrame (stack) {
    return new Promise(function (resolve, reject) {
      // Build Opbeat frame data
      var frame = {
        'filename': this.cleanFileUrl(stack.fileName),
        'lineno': stack.lineNumber,
        'colno': stack.columnNumber,
        'function': stack.functionName || '[anonymous]'
      }

      // Resolve contexts
      var contextsResolver = this.getExceptionContexts(stack.fileName, stack.lineNumber)
      contextsResolver.then(function (contexts) {
        frame.pre_context = contexts.preContext
        frame.context_line = contexts.contextLine
        frame.post_context = contexts.postContext
      })

      // Detect Sourcemaps
      var sourceMapResolver = this.getFileSourceMapUrl(stack.fileName)
      sourceMapResolver.then(function (sourceMapUrl) {
        frame.sourcemap_url = sourceMapUrl
      }).caught(function () {})

      // Resolve frame when everything is over
      Promise.any([sourceMapResolver, contextsResolver]).then(function () {
        resolve(frame)
      })

    }.bind(this))

  },

  stackInfoToOpbeatException: function (stackInfo) {
    return new Promise(function (resolve, reject) {
      if (stackInfo.stack && stackInfo.stack.length) {
        var framesPromises = stackInfo.stack.map(function (stack, i) {
          return this.buildOpbeatFrame(stack)
        }.bind(this))

        Promise.all(framesPromises).then(function (frames) {
          stackInfo.frames = frames
          stackInfo.stack = null
          resolve(stackInfo)
        })
      } else {
        resolve(stackInfo)
      }

    }.bind(this))

    stackInfo.frames = []

    return stackInfo

  },

  cleanFileUrl: function (fileUrl) {
    if (!fileUrl) {
      fileUrl = ''
    }

    var origin = window.location.origin || window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port: '')

    if (fileUrl.indexOf(origin) > -1) {
      fileUrl = fileUrl.replace(origin + '/', '')
    }

    return fileUrl
  },

  processException: function processException (exception) {
    var type = exception.type
    var message = String(exception.message) || 'Script error'
    var fileUrl = this.cleanFileUrl(exception.fileurl)
    var frames = exception.frames || []

    if (frames && frames.length) {
      // Opbeat.com expects frames oldest to newest and JS sends them as newest to oldest
      frames.reverse()
    } else if (fileUrl) {
      frames.push({
        filename: fileUrl,
        lineno: exception.lineno
      })
    }

    var stacktrace = {
      frames: frames
    }

    // Set fileUrl from last frame, if filename is missing
    if (!fileUrl && frames.length) {
      var lastFrame = frames[frames.length - 1]
      if (lastFrame.filename) {
        fileUrl = lastFrame.filename
      } else {
        // If filename empty, use location path and assume inline script
        fileUrl = window.location.pathname + ' (inline script)'
      }
    }

    var culprit = fileUrl

    var data = {
      message: type + ': ' + message,
      culprit: culprit,
      exception: {
        type: type,
        value: message
      },
      stacktrace: stacktrace,
      user: config.get('context.user'),
      timestamp: parseInt((new Date).getTime() / 1000, 10),
      level: null,
      logger: null,
      machine: null
    }

    data.extra = this.getBrowserSpecificMetadata()

    if (config.get('context.extra')) {
      data.extra = utils.mergeObject(data.extra, config.get('context.extra'))
    }

    logger.log('opbeat.exceptionst.processException', data)
    transport.sendToOpbeat(data)

  },

  getFileSourceMapUrl: function (fileUrl) {
    function _findSourceMappingURL (source) {
      var m = /\/\/[#@] ?sourceMappingURL=([^\s'"]+)$/.exec(source)
      if (m && m[1]) {
        return m[1]
      }
      return null
    }

    if (fileUrl.split('/').length > 1) {
      fileBasePath = fileUrl.split('/').slice(0, -1).join('/') + '/'
    } else {
      fileBasePath = '/'
    }

    return new Promise(function (resolve, reject) {
      transport.getFile(fileUrl).then(function (source) {
        var sourceMapUrl = _findSourceMappingURL(source)
        if (sourceMapUrl) {
          sourceMapUrl = fileBasePath + sourceMapUrl
          resolve(sourceMapUrl)
        } else {
          reject(null)
        }
      }).caught(reject)

    })
  },

  getExceptionContexts: function (url, line) {
    return new Promise(function (resolve, reject ) {
      transport.getFile(url).then(function (source) {
        source = source.split('\n')
        line -= 1; // convert line to 0-based index

        var linesBefore = 5
        var linesAfter = 5

        var contexts = {
          preContext: [],
          contextLine: null,
          postContext: []
        }

        if (source.length) {
          // Pre context
          var preStartIndex = Math.max(0, line - linesBefore - 1)
          var preEndIndex = Math.min(source.length, line - 1)
          for (var i = preStartIndex; i <= preEndIndex; ++i) {
            if (!utils.isUndefined(source[i])) {
              contexts.preContext.push(source[i])
            }
          }

          // Line context
          contexts.contextLine = source[line]

          // Post context
          var postStartIndex = Math.min(source.length, line + 1)
          var postEndIndex = Math.min(source.length, line + linesAfter)
          for (var i = postStartIndex; i <= postEndIndex; ++i) {
            if (!utils.isUndefined(source[i])) {
              contexts.postContext.push(source[i])
            }
          }
        }

        logger.log('Opbeat.getExceptionContexts', contexts)
        resolve(contexts)

      }).caught(reject)

    })

  },

  getBrowserSpecificMetadata: function () {
    var viewportInfo = utils.getViewPortInfo()
    var extra = {
      'environment': {
        'utcOffset': new Date().getTimezoneOffset() / -60.0,
        'browserWidth': viewportInfo.width,
        'browserHeight': viewportInfo.height,
        'screenWidth': window.screen.width,
        'screenHeight': window.screen.height,
        'language': navigator.language,
        'userAgent': navigator.userAgent,
        'platform': navigator.platform
      },
      'page': {
        'referer': document.referrer,
        'host': document.domain,
        'location': window.location.href
      }
    }

    return extra
  }

}
