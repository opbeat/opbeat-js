var ServiceContainer = require('../common/serviceContainer')
var ServiceFactory = require('../common/serviceFactory')
var patchAngularBootstrap = require('./bootstrapPatch')
var isAngularSupported = require('./isAngularSupported')
var ngOpbeat = require('./ngOpbeat')

function init () {
  var serviceFactory = new ServiceFactory()

  var services = new ServiceContainer(serviceFactory).services

  if (typeof window.angular === 'undefined') {
    throw new Error('AngularJS is not available. Please make sure you load opbeat-angular after AngularJS.')
  } else if (!services.configService.isPlatformSupported()) {
    ngOpbeat(services.transactionService, services.logger, services.configService, isAngularSupported)
    services.logger.warn('Platform is not supported.')
  } else if (!isAngularSupported()) {
    ngOpbeat(services.transactionService, services.logger, services.configService, isAngularSupported)
    services.logger.warn('AngularJS version is not supported.')
  } else {
    services.patchingService.patchAll()
    patchAngularBootstrap(services.zoneService)

    ngOpbeat(services.transactionService, services.logger, services.configService, isAngularSupported, services.exceptionHandler)
  }

  return services
}

init()
