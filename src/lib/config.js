var utils = require('./utils')

function Config () {
  this.config = {}
  this.defaults = {
    VERSION: this.VERSION,
    orgId: null,
    appId: null,
    token: null,
    context: {
      user: null,
      extra: null
    }
  }
}

Config.prototype.init = function () {
  var scriptData = _getConfigFromScript()
  this.setConfig(scriptData)
}

Config.prototype.get = function (key) {
  return key.split('.').reduce(function (obj, i) {
    return obj[i]
  }, this.config)
},

Config.prototype.set = function (key, value) {
  var levels = key.split('.')
  var max_level = levels.length - 1
  var target = this.config

  levels.some(function (level, i) {
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
},

Config.prototype.setConfig = function (properties) {
  properties = properties || {}
  this.config = utils.mergeObject(this.defaults, properties)
}

Config.prototype.isValid = function () {
  var requiredKeys = ['appId', 'orgId', 'token']
  var values = requiredKeys.map(function (key) {
    return this.config[key] === undefined
  }.bind(this))

  return values.indexOf(true) === -1
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
        key = key.split('-').map(function (group, index) {
          return index > 0 ? group.charAt(0).toUpperCase() + group.substring(1) : group
        }).join('')

        dataAttrs[key] = attr.value || attr.nodeValue
      }
    }
  }

  return dataAttrs
}

module.exports = new Config()
