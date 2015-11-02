var ErrorStackParser = require('error-stack-parser')
var StackGenerator = require('stack-generator')
var Promise = require('bluebird')
var utils = require('../lib/utils')

var defaultOptions = {
  filter: function (stackframe) {
    // Filter out stackframes for this library by default
    return (stackframe.functionName || '').indexOf('StackTrace$$') === -1 &&
      (stackframe.functionName || '').indexOf('ErrorStackParser$$') === -1 &&
      (stackframe.functionName || '').indexOf('StackGenerator$$') === -1 &&
      (stackframe.fileName || '').indexOf('angular-opbeat.js') === -1 &&
      (stackframe.fileName || '').indexOf('angular-opbeat.min.js') === -1 &&
      (stackframe.fileName || '').indexOf('opbeat.js') === -1 &&
      (stackframe.fileName || '').indexOf('opbeat.min.js') === -1
  }
}

module.exports = {
  get: function StackTrace$$generate (opts) {
    try {
      // Error must be thrown to get stack in IE
      throw new Error()
    } catch (err) {
      if (_isShapedLikeParsableError(err)) {
        return this.fromError(err, opts)
      } else {
        return this.generateArtificially(opts)
      }
    }
  },

  generateArtificially: function StackTrace$$generateArtificially (opts) {
    opts = utils.mergeObject(defaultOptions, opts)

    var stackFrames = StackGenerator.backtrace(opts)
    if (typeof opts.filter === 'function') {
      stackFrames = stackFrames.filter(opts.filter)
    }
    return Promise.resolve(stackFrames)
  },

  fromError: function StackTrace$$fromError (error, opts) {
    opts = utils.mergeObject(defaultOptions, opts)

    return new Promise(function (resolve) {
      var stackframes = ErrorStackParser.parse(error)
      if (typeof opts.filter === 'function') {
        stackframes = stackframes.filter(opts.filter)
      }
      resolve(Promise.all(stackframes.map(function (sf) {
        return new Promise(function (resolve) {
          resolve(sf)
        })
      })))
    })
  }
}

function _isShapedLikeParsableError (err) {
  return err.stack || err['opera#sourceloc']
}
