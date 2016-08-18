var ngOpbeat = require('./ngOpbeat')
var patchAngularBootstrap = require('./patches/bootstrapPatch')
var patchCommon = require('../common/patchCommon')

function initialize (serviceContainer) {
  var services = serviceContainer.services
  if (!services.configService.isPlatformSupported()) {
    registerOpbeatModule(services)
    services.logger.warn('Platform is not supported.')
  } else {
    var alreadyRegistered = false
    patchCommon(serviceContainer)
    patchAngularBootstrap(services.zoneService, function (modules) {
      // We're adding 'ngOpbeat' just before bootstrap, so it doesn't have to be specified in the dependencies

      if (modules && typeof modules.unshift === 'function') {
        modules.unshift('ngOpbeat')
      }
      if (!alreadyRegistered) {
        alreadyRegistered = true
        registerOpbeatModule(services)
      }
    })
  }
}

function registerOpbeatModule (services) {
  ngOpbeat(services.transactionService, services.logger, services.configService, services.exceptionHandler)
}

module.exports = initialize
