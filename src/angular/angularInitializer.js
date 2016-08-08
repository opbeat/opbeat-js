var ngOpbeat = require('./ngOpbeat')
var patchAngularBootstrap = require('./bootstrapPatch')

function initialize(serviceContainer, isAngularSupported) {
  var services = serviceContainer.services
  if (typeof window.angular === 'undefined') {
    throw new Error('AngularJS is not available. Please make sure you load opbeat-angular after AngularJS.')
  } else if (!services.configService.isPlatformSupported()) {
    registerOpbeatModule(services, isAngularSupported)
    services.logger.warn('Platform is not supported.')
  } else if (!isAngularSupported()) {
    registerOpbeatModule(services, isAngularSupported)
    services.logger.warn('AngularJS version is not supported.')
  } else {
    services.patchingService.patchAll()
    patchAngularBootstrap(services.zoneService)
    registerOpbeatModule(services, isAngularSupported)
  }
}

function registerOpbeatModule(services, isAngularSupported) {
    ngOpbeat(services.transactionService, services.logger, services.configService, isAngularSupported, services.exceptionHandler)
}

module.exports = initialize