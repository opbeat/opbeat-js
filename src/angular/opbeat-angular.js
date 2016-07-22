var ServiceContainer = require('./serviceContainer')
var ServiceFactory = require('../common/serviceFactory')
function init () {
  var serviceFactory = new ServiceFactory()
  var services = new ServiceContainer(serviceFactory).services
  return services
}

init()
