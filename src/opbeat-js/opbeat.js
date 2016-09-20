require('es6-promise')

var ServiceFactory = require('../common/serviceFactory')
var Opbeat = require('./opbeatPlain')

module.exports = new Opbeat(new ServiceFactory())
