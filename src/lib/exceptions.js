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
      if (!stack.fileName && !stack.lineNumber) {
        // Probably an stack from IE, return empty frame as we can't use it.
        return resolve({})
      }

      var cleanedFileName = this.cleanFileName(stack.fileName)

      // Build Opbeat frame data
      var frame = {
        'filename': this.fileUrlToFileName(cleanedFileName),
        'lineno': stack.lineNumber,
        'colno': stack.columnNumber,
        'function': stack.functionName || '[anonymous]',
        'abs_path': stack.fileName
      }

      // Detect Sourcemaps
      var sourceMapResolver = this.getFileSourceMapUrl(cleanedFileName)

      sourceMapResolver.then(function (sourceMapUrl) {
        frame.sourcemap_url = sourceMapUrl
        resolve(frame)
      }).caught(function () {
        // // Resolve contexts if no source map
        var cleanedFileName = this.cleanFileName(stack.fileName)
        var contextsResolver = this.getExceptionContexts(cleanedFileName, stack.lineNumber)

        contextsResolver.then(function (contexts) {
          frame.pre_context = contexts.preContext
          frame.context_line = contexts.contextLine
          frame.post_context = contexts.postContext

          resolve(frame)
        }).caught(function () {
          resolve(frame)
        })

      }.bind(this))

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

  cleanFileName: function (fileName) {
    if (!fileName) {
      fileName = ''
    }

    if (fileName === '<anonymous>') {
      fileName = ''
    }

    return fileName
  },

  fileUrlToFileName: function (fileUrl) {
    var origin = window.location.origin || window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port: '')

    if (fileUrl.indexOf(origin) > -1) {
      fileUrl = fileUrl.replace(origin + '/', '')
    }

    return fileUrl
  },

  processException: function processException (exception) {
    var type = exception.type
    var message = String(exception.message) || 'Script error'
    var fileUrl = this.fileUrlToFileName(this.cleanFileName(exception.fileurl))
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
        // If filename empty, assume inline script
        fileUrl = '(inline script)'
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
      http: {
        url: window.location.href
      },
      stacktrace: stacktrace,
      user: config.get('context.user'),
      level: null,
      logger: null,
      machine: null
    }

    data.extra = this.getBrowserSpecificMetadata()

    if (config.get('context.extra')) {
      data.extra = utils.mergeObject(data.extra, config.get('context.extra'))
    }

    logger.log('opbeat.exceptionst.processException', data)
    transport.sendError(data)

  },

  getFileSourceMapUrl: function (fileUrl) {
    if (!fileUrl) {
      return Promise.reject()
    }

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
          reject('no sourceMapUrl')
        }
      }).caught(reject)
    })
  },

  isSourceMinified: function (source) {
    // Source: https://dxr.mozilla.org/mozilla-central/source/devtools/client/debugger/utils.js#62
    var SAMPLE_SIZE = 50 // no of lines
    var INDENT_COUNT_THRESHOLD = 5 // percentage
    var CHARACTER_LIMIT = 250 // line character limit

    var isMinified
    var lineEndIndex = 0
    var lineStartIndex = 0
    var lines = 0
    var indentCount = 0
    var overCharLimit = false

    // Strip comments.
    source = source.replace(/\/\*[\S\s]*?\*\/|\/\/(.+|\n)/g, '')

    while (lines++ < SAMPLE_SIZE) {
      lineEndIndex = source.indexOf('\n', lineStartIndex)
      if (lineEndIndex == -1) {
        break
      }
      if (/^\s+/.test(source.slice(lineStartIndex, lineEndIndex))) {
        indentCount++
      }
      // For files with no indents but are not minified.
      if ((lineEndIndex - lineStartIndex) > CHARACTER_LIMIT) {
        overCharLimit = true
        break
      }
      lineStartIndex = lineEndIndex + 1
    }

    isMinified = ((indentCount / lines) * 100) < INDENT_COUNT_THRESHOLD || overCharLimit

    return isMinified
  },

  getExceptionContexts: function (url, line) {
    if (!url || !line) {
      return Promise.reject()
    }

    return new Promise(function (resolve, reject) {
      transport.getFile(url).then(function (source) {
        line -= 1; // convert line to 0-based index

        var sourceLines = source.split('\n')
        var linesBefore = 5
        var linesAfter = 5

        var contexts = {
          preContext: [],
          contextLine: null,
          postContext: []
        }

        if (sourceLines.length) {

          var isMinified

          if(source.indexOf('<html') > -1) {
            isMinified = false
          } else {
            isMinified = this.isSourceMinified(source)
          }

          // Don't generate contexts if source is minified
          if (isMinified) {
            return reject()
          }

          // Pre context
          var preStartIndex = Math.max(0, line - linesBefore - 1)
          var preEndIndex = Math.min(sourceLines.length, line - 1)
          for (var i = preStartIndex; i <= preEndIndex; ++i) {
            if (!utils.isUndefined(sourceLines[i])) {
              contexts.preContext.push(sourceLines[i])
            }
          }

          // Line context
          contexts.contextLine = sourceLines[line]

          // Post context
          var postStartIndex = Math.min(sourceLines.length, line + 1)
          var postEndIndex = Math.min(sourceLines.length, line + linesAfter)
          for (var i = postStartIndex; i <= postEndIndex; ++i) {
            if (!utils.isUndefined(sourceLines[i])) {
              contexts.postContext.push(sourceLines[i])
            }
          }
        }

        logger.log('Opbeat.getExceptionContexts', contexts)
        resolve(contexts)

      }.bind(this)).caught(reject)

    }.bind(this))

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
