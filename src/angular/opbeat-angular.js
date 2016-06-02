
var ServiceContainer = require('./serviceContainer')
function init () {
  var services = new ServiceContainer().services
  return services
}

init()
