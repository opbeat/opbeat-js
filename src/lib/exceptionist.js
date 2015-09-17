var logger = require('./logger')
var transport = require('./transport')
var utils = require('./utils')
var stacktraceGps = require('stacktrace-gps')

module.exports = {
  buildOpbeatFrame: function buildOpbeatFrame (stack, options) {
    options = options || {}

    return new Promise(function (resolve, reject) {
      if (!stack.fileName) {
        resolve({})
      }

      // normalize the frames data
      var frame = {
        'filename': this.cleanFileUrl(stack.fileName),
        'lineno': stack.lineNumber,
        'colno': stack.columnNumber,
        'function': stack.functionName || '[anonymous]'
      }

      // Contexts
      this.getExceptionContexts(stack.fileName, stack.lineNumber).then(function (contexts) {
        frame.pre_context = contexts.preContext
        frame.context_line = contexts.contextLine
        frame.post_context = contexts.postContext

        resolve(frame)
      })

    }.bind(this))

  },

  stackInfoToOpbeatException: function (stackInfo, options) {
    options = options || {}

    return new Promise(function (resolve, reject) {
      if (stackInfo.stack && stackInfo.stack.length) {
        var framesPromises = stackInfo.stack.map(function (stack, i) {
          return this.buildOpbeatFrame(stack)
        }.bind(this))

        Promise.all(framesPromises).then(function (frames) {
          stackInfo.frames = frames
          resolve(stackInfo)
        })
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

  processException: function processException (exception, options) {
    options = options || {}

    var stacktrace

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

    stacktrace = {
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
      user: options.context ? options.context.user : null,
      timestamp: parseInt((new Date).getTime() / 1000, 10),
      level: null,
      logger: null,
      machine: null
    }

    data.extra = this.getBrowserSpecificMetadata()

    if (options.context && options.context.extra) {
      data.extra = utils.mergeObject(data.extra, options.context.extra)
    }

    logger.log('opbeat.exceptionst.processException', data)
    transport.sendToOpbeat(data, options)

  },

  getExceptionContexts: function (url, line) {
    return new Promise(function (resolve, reject ) {
      var gps = new stacktraceGps()

      gps._get(url).then(function (source) {
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
      })

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
