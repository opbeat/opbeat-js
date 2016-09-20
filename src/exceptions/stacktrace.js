var ErrorStackParser = require('error-stack-parser')
var StackGenerator = require('stack-generator')
var utils = require('../lib/utils')

var defaultOptions = {
  filter: function (stackframe) {
    // Filter out stackframes for this library by default
    return (stackframe.functionName || '').indexOf('StackTrace$$') === -1 &&
    (stackframe.functionName || '').indexOf('ErrorStackParser$$') === -1 &&
    (stackframe.functionName || '').indexOf('StackGenerator$$') === -1 &&
    (stackframe.functionName || '').indexOf('opbeatFunctionWrapper') === -1 &&
    (stackframe.fileName || '').indexOf('opbeat-angular.js') === -1 &&
    (stackframe.fileName || '').indexOf('opbeat-angular.min.js') === -1 &&
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

    stackFrames = ErrorStackNormalizer(stackFrames)

    return Promise.resolve(stackFrames)
  },

  fromError: function StackTrace$$fromError (error, opts) {
    opts = utils.mergeObject(defaultOptions, opts)

    return new Promise(function (resolve) {
      var stackFrames = ErrorStackParser.parse(error)
      if (typeof opts.filter === 'function') {
        stackFrames = stackFrames.filter(opts.filter)
      }

      stackFrames = ErrorStackNormalizer(stackFrames)

      resolve(Promise.all(stackFrames.map(function (sf) {
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

function ErrorStackNormalizer (stackFrames) {
  return stackFrames.map(function (frame) {
    if (frame.functionName) {
      frame.functionName = normalizeFunctionName(frame.functionName)
    }
    return frame
  })
}

function normalizeFunctionName (fnName) {
  // SpinderMonkey name convetion (https://developer.mozilla.org/en-US/docs/Tools/Debugger-API/Debugger.Object#Accessor_Properties_of_the_Debugger.Object_prototype)

  // We use a/b to refer to the b defined within a
  var parts = fnName.split('/')
  if (parts.length > 1) {
    fnName = ['Object', parts[parts.length - 1]].join('.')
  } else {
    fnName = parts[0]
  }

  // a< to refer to a function that occurs somewhere within an expression that is assigned to a.
  fnName = fnName.replace(/.<$/gi, '.<anonymous>')

  // Normalize IE's 'Anonymous function'
  fnName = fnName.replace(/^Anonymous function$/, '<anonymous>')

  // Always use the last part
  parts = fnName.split('.')
  if (parts.length > 1) {
    fnName = parts[parts.length - 1]
  } else {
    fnName = parts[0]
  }

  return fnName
}
