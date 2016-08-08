var ServiceContainer = require('../common/serviceContainer')
var ServiceFactory = require('../common/serviceFactory')
var isAngularSupported = require('./isAngularSupported')
var ngOpbeat = require('./ngOpbeat')

function init () {
  var serviceFactory = new ServiceFactory()
  var serviceContainer = new ServiceContainer(serviceFactory)
  ngOpbeat(serviceContainer, isAngularSupported)
  return services
}

init()
