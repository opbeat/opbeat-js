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
  }

}
