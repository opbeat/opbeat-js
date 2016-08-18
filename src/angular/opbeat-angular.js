var ServiceContainer = require('../common/serviceContainer')
var ServiceFactory = require('../common/serviceFactory')
var angularInitializer = require('./angularInitializer')

function init () {
  var serviceFactory = new ServiceFactory()
  var serviceContainer = new ServiceContainer(serviceFactory)

  angularInitializer(serviceContainer)
}

init()
