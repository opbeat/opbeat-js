var ExceptionHandler = require('../../src/exceptions/exceptionHandler')

function OpbeatBackendMock () {
  this.sendError = function () {}
}
describe('ExceptionHandler', function () {
  var opbeatBackend
  var exceptionHandler
  beforeEach(function () {
    opbeatBackend = new OpbeatBackendMock()
    exceptionHandler = new ExceptionHandler(opbeatBackend)
  })
  it('should process errors', function (done) {
    exceptionHandler.processError(new Error())
      .then(function () {
        done()
      })
  })
})
