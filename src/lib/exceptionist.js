var logger = require('./logger')
var transport = require('./transport')
var utils = require('./utils')

module.exports = {
  normalizeFrame: function normalizeFrame (frame, options) {
    options = options || {}

    if (!frame.url) return

    // normalize the frames data
    var normalized = {
      'filename': this.cleanFileUrl(frame.url),
      'lineno': frame.line,
      'colno': frame.column,
      'function': frame.func || '[anonymous]'
    }

    return normalized
  },

  traceKitStackToOpbeatException: function (stackInfo, options) {
    options = options || {}
    stackInfo.frames = []

    if (stackInfo.stack && stackInfo.stack.length) {
      stackInfo.stack.forEach(function (stack, i) {
        var frame = this.normalizeFrame(stack)
        if (frame) {
          stackInfo.frames.push(frame)
        }
      }.bind(this))
    }

    return stackInfo

  },

  cleanFileUrl: function (fileUrl) {
    if (!fileUrl) {
      fileUrl = ''
    }

    if (fileUrl.indexOf(window.location.href) > -1) {
      fileUrl = fileUrl.replace(window.location.href, '')
    }

    return fileUrl
  },

  processException: function processException (exception, options) {
    options = options || {}

    var stacktrace

    var type = exception.name
    var message = String(exception.message) || 'Script error'
    var fileurl = this.cleanFileUrl(exception.fileurl)
    var frames = exception.frames || []
    var culprit = fileurl

    if (frames && frames.length) {
      // Opbeat.com expects frames oldest to newest and JS sends them as newest to oldest
      frames.reverse()
    } else if (fileurl) {
      frames.push({
        filename: fileurl,
        lineno: lineno
      })
    }

    stacktrace = {
      frames: frames
    }

    // Overrride culprit from first frame, if filename is missing
    if (!culprit && frames.length && frames[0].filename.length) {
      culprit = frames[0].filename
    } else if (!fileUrl) {
      culprit = '/'
    }

    var data = {
      message: type + ': ' + message,
      culprit: culprit,
      exception: {
        type: type,
        value: message
      },
      stacktrace: stacktrace,
      user: options.context.user || null,
      timestamp: parseInt((new Date).getTime() / 1000, 10),
      level: null,
      logger: null,
      machine: null
    }

    data.extra = this.getBrowserSpecificMetadata()

    if (options.context.extra) {
      data.extra = utils.mergeObject(data.extra, options.context.extra)
    }

    logger.log('opbeat.exceptionst.processException', data)
    transport.sendToOpbeat(data, options)

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
