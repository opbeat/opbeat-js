var Promise = require('bluebird')

var logger = require('../lib/logger')
var config = require('../lib/config')
var transport = require('../lib/transport')
var utils = require('../lib/utils')
var context = require('./context')

module.exports = {

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
      var sourceMapResolver = context.getFileSourceMapUrl(cleanedFileName)

      sourceMapResolver.then(function (sourceMapUrl) {
        frame.sourcemap_url = sourceMapUrl
        resolve(frame)
      }).caught(function () {
        // // Resolve contexts if no source map
        var cleanedFileName = this.cleanFileName(stack.fileName)
        var contextsResolver = context.getExceptionContexts(cleanedFileName, stack.lineNumber)

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

  processOpbeatException: function (exception) {
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

    logger.log('opbeat.exceptions.processOpbeatException', data)
    transport.sendError(data)

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
