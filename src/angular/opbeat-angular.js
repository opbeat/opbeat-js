var ServiceContainer = require('../common/serviceContainer')
var ServiceFactory = require('../common/serviceFactory')
var isAngularSupported = require('./isAngularSupported')
var ngOpbeat = require('./ngOpbeat')
var angularInitializer = require('./angularInitializer')

function init () {
  var serviceFactory = new ServiceFactory()
  var serviceContainer = new ServiceContainer(serviceFactory)

  angularInitializer(serviceContainer, isAngularSupported)
}

init()
