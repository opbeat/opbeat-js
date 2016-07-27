var ServiceFactory = require('../../src/common/serviceFactory')
var Config = require('../../src/lib/config')

function OpbeatBackendMock () {
  this.sendError = function () {}
}
describe('ExceptionHandler', function () {
  var exceptionHandler
  var config
  var opbeatBackend
  beforeEach(function () {
    var serviceFactory = new ServiceFactory()
    config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config
    opbeatBackend = new OpbeatBackendMock()
    serviceFactory.services['OpbeatBackend'] = opbeatBackend

    exceptionHandler = serviceFactory.getExceptionHandler()
  })
  it('should process errors', function (done) {
    exceptionHandler.processError(new Error())
      .then(function () {
        done()
      }, function (reason) {
        fail(reason)
      })
  })
})
