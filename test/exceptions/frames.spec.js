var frames = require('../../src/exceptions/frames')
describe('exceptions.frames', function () {
  var originalTimeout

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000
  })
  it('should produce correct number of frames', function (done) {
    setTimeout(function () {
      frames.getFramesForCurrent().then(function (framesData) {
        expect(framesData.length).toBe(5)
        done()
      })
    }, 1)
  })

  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
  })
})
