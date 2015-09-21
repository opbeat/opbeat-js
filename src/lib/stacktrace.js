var ErrorStackParser = require('error-stack-parser')
var Promise = require('bluebird')
var utils = require('./utils')

var defaultOptions = {
  filter: function (stackframe) {
    // Filter out stackframes for this library by default
    return (stackframe.functionName || '').indexOf('StackTrace$$') === -1 &&
      (stackframe.functionName || '').indexOf('ErrorStackParser$$') === -1 &&
      (stackframe.functionName || '').indexOf('StackGenerator$$') === -1
  }
}

module.exports = {
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
    }.bind(this))
  }

}
