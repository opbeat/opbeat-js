var frames = require('../../src/exceptions/frames')
describe('exceptions.frames', function () {
  it('should produce correct number of frames', function () {
    frames.getFramesForCurrent().then(function (framesData) {
      expect(framesData.length).toBe(9)
    })
  })
})
