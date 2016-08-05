var ServiceContainer = require('./serviceContainer')
var ServiceFactory = require('../common/serviceFactory')
function init () {
  var serviceFactory = new ServiceFactory()

  var serviceContainer = new ServiceContainer(serviceFactory)
  serviceContainer.init()
}

init()
