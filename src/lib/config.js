var utils = require('./utils')

module.exports = {
  getConfig: function () {
    var defaults = {
      VERSION: this.VERSION,
      orgId: null,
      appId: null,
      token: null,
      context: {
        user: null,
        extra: null
      }
    }

    var config = defaults
    var data = this.getConfigFromScript()
    if (data) {
      config = utils.mergeObject(defaults, data)
    }

    return config
  },

  getConfigFromScript: function () {
    var script = utils.getCurrentScript()
    var config = this.getDataAttributesFromNode(script)
    return config
  },

  isConfigValid: function (config) {
    var requiredKeys = ['appId', 'orgId', 'token']
    var values = requiredKeys.map(function (key) {
      return config[key] === undefined
    })

    return values.indexOf(true) === -1
  },

  getDataAttributesFromNode: function (node) {
    var dataAttrs = {}
    var dataRegex = /^data\-([\w\-]+)$/

    if (node) {
      var attrs = node.attributes
      for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i]
        if (dataRegex.test(attr.nodeName)) {
          var key = attr.nodeName.match(dataRegex)[1]

          // Camel case key
          key = key.split('-').map(function (group, index) {
            return index > 0 ? group.charAt(0).toUpperCase() + group.substring(1) : group
          }).join('')

          dataAttrs[key] = attr.value || attr.nodeValue
        }
      }
    }

    return dataAttrs
  }

}
