module.exports = {
  createValidFrames: function createValidFrames (frames) {
    var result = []
    if (Array.isArray(frames)) {
      result = frames.filter(function (f) {
        return (typeof f['filename'] !== 'undefined' && typeof f['lineno'] !== 'undefined')
      })
    }
    return result
  }
}
