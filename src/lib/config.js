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

    return config
  },

  isConfigValid: function (config) {
    var requiredKeys = ['appId', 'orgId', 'token']
    var values = requiredKeys.map(function (key) {
      return config[key] === undefined
    })

    return values.indexOf(true) === -1
  },

}
