var utils = require('./utils')
var Subscription = require('../common/subscription')

function Config () {
  this.config = {}
  this.defaults = {
    VERSION: '%%VERSION%%',
    apiHost: 'intake.opbeat.com',
    isInstalled: false,
    debug: false,
    logLevel: 'warn',
    orgId: null,
    appId: null,
    angularAppName: null,
    performance: {
      enable: true,
      enableStackFrames: false,
      groupSimilarTraces: false,
      similarTraceThershold: 0.05
    },
    libraryPathPattern: '(node_modules|bower_components|webpack)',
    context: {
      user: {},
      extra: null
    }
  }

  // Only generate stack frames 10% of the time
  var shouldGenerateStackFrames = utils.getRandomInt(0, 10) === 1
  if (shouldGenerateStackFrames) {
    this.defaults.performance.enableStackFrames = shouldGenerateStackFrames
  }

  this._changeSubscription = new Subscription()
}

Config.prototype.init = function () {
  var scriptData = _getConfigFromScript()
  this.setConfig(scriptData)
}

Config.prototype.get = function (key) {
  return utils.arrayReduce(key.split('.'), function (obj, i) {
    return obj[i]
  }, this.config)
}

Config.prototype.set = function (key, value) {
  var levels = key.split('.')
  var max_level = levels.length - 1
  var target = this.config

  utils.arraySome(levels, function (level, i) {
    if (typeof level === 'undefined') {
      return true
    }
    if (i === max_level) {
      target[level] = value
    } else {
      var obj = target[level] || {}
      target[level] = obj
      target = obj
    }
  })
}

Config.prototype.setConfig = function (properties) {
  properties = properties || {}
  var prevCfg = utils.mergeObject(this.defaults, this.config)
  this.config = utils.mergeObject(prevCfg, properties)
  this._changeSubscription.applyAll(this, [this.config])
}

Config.prototype.subscribeToChange = function (fn) {
  return this._changeSubscription.subscribe(fn)
}

Config.prototype.isValid = function () {
  var requiredKeys = ['appId', 'orgId']
  var values = utils.arrayMap(requiredKeys, utils.functionBind(function (key) {
    return (this.config[key] === null) || (this.config[key] === undefined)
  }, this))

  return utils.arrayIndexOf(values, true) === -1
}

var _getConfigFromScript = function () {
  var script = utils.getCurrentScript()
  var config = _getDataAttributesFromNode(script)
  return config
}

function _getDataAttributesFromNode (node) {
  var dataAttrs = {}
  var dataRegex = /^data\-([\w\-]+)$/

  if (node) {
    var attrs = node.attributes
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i]
      if (dataRegex.test(attr.nodeName)) {
        var key = attr.nodeName.match(dataRegex)[1]

        // camelCase key
        key = utils.arrayMap(key.split('-'), function (group, index) {
          return index > 0 ? group.charAt(0).toUpperCase() + group.substring(1) : group
        }).join('')

        dataAttrs[key] = attr.value || attr.nodeValue
      }
    }
  }

  return dataAttrs
}

Config.prototype.VERSION = '%%VERSION%%'

Config.prototype.isPlatformSupport = function () {
  return typeof Array.prototype.forEach === 'function' &&
  typeof JSON.stringify === 'function' &&
  typeof Function.bind === 'function' &&
  window.performance &&
  typeof window.performance.now === 'function' &&
  utils.isCORSSupported()
}

module.exports = new Config()
