var utils = require('../lib/utils')
var fileFetcher = require('../lib/fileFetcher')

module.exports = {

  _findSourceMappingURL: function (source) {
    var m = /\/\/[#@] ?sourceMappingURL=([^\s'"]+)[\s]*$/.exec(source)
    if (m && m[1]) {
      return m[1]
    }
    return null
  },

  getFileSourceMapUrl: function (fileUrl) {
    var self = this
    var fileBasePath

    if (!fileUrl) {
      return Promise.reject('no fileUrl')
    }

    if (fileUrl.split('/').length > 1) {
      fileBasePath = fileUrl.split('/').slice(0, -1).join('/') + '/'
    } else {
      fileBasePath = '/'
    }

    return new Promise(function (resolve, reject) {
      fileFetcher.getFile(fileUrl).then(function (source) {
        var sourceMapUrl = self._findSourceMappingURL(source)
        if (sourceMapUrl) {
          sourceMapUrl = fileBasePath + sourceMapUrl
          resolve(sourceMapUrl)
        } else {
          reject('no sourceMapUrl')
        }
      }, reject)
    })
  },

  getExceptionContexts: function (url, line) {
    if (!url || !line) {
      return Promise.reject('no line or url')
    }

    return new Promise(function (resolve, reject) {
      fileFetcher.getFile(url).then(function (source) {
        line -= 1 // convert line to 0-based index

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

          // Treat HTML files as non-minified
          if (source.indexOf('<html') > -1) {
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
          for (var j = postStartIndex; j <= postEndIndex; ++j) {
            if (!utils.isUndefined(sourceLines[j])) {
              contexts.postContext.push(sourceLines[j])
            }
          }
        }

        var charLimit = 1000
        // Circuit breaker for huge file contexts
        if (contexts.contextLine.length > charLimit) {
          reject('aborting generating contexts, as line is over 1000 chars')
        }

        contexts.preContext.forEach(function (line) {
          if (line.length > charLimit) {
            reject('aborting generating contexts, as preContext line is over 1000 chars')
          }
        })

        contexts.postContext.forEach(function (line) {
          if (line.length > charLimit) {
            reject('aborting generating contexts, as postContext line is over 1000 chars')
          }
        })

        resolve(contexts)
      }.bind(this), reject)
    }.bind(this))
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

    if (!source) {
      return false
    }

    // Strip comments.
    source = source.replace(/\/\*[\S\s]*?\*\/|\/\/(.+|\n)/g, '')

    while (lines++ < SAMPLE_SIZE) {
      lineEndIndex = source.indexOf('\n', lineStartIndex)
      if (lineEndIndex === -1) {
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
  }

}
