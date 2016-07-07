var frames = require('../../src/exceptions/frames')
describe('exceptions.frames', function () {
  it('should produce correct number of frames', function (done) {
    setTimeout(function () {
      frames.getFramesForCurrent().then(function (framesData) {
        expect(framesData.length).toBe(5)
        done()
      })
    }, 0)
  })
})
