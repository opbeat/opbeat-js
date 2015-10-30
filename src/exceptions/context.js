var Promise = require('bluebird')
var SimpleCache = require('simple-lru-cache')

var logger = require('../lib/logger')
var transport = require('../lib/transport')
var utils = require('../lib/utils')

var cache = new SimpleCache({
  'maxSize': 1000
})

var _getFile = function(url) {

  return new Promise(function(resolve, reject) {
    var cachedSource = cache.get(url)

    if(cachedSource) {
      resolve(source)
    } else {
      transport.getFile(url).then(function (source) {
        cache.set(url, source)
        resolve(source)
      }).catch(function() {
        reject()
      })
    }
  })
}

module.exports = {

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
      _getFile(fileUrl).then(function (source) {
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

  getExceptionContexts: function (url, line) {

    if (!url || !line) {
      return Promise.reject()
    }

    return new Promise(function (resolve, reject) {

      _getFile(url).then(function (source) {
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

          // Treat HTML files as non-minified
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
  }

}
