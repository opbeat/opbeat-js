var patchXMLHttpRequest = require('./patches/xhrPatch')

function patchCommon (serviceContainer) {
  patchXMLHttpRequest(serviceContainer)
}

module.exports = patchCommon
