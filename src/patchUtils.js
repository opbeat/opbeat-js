module.exports = {
  patchFunction: function patchModule (delegate, options) {},
  _copyProperties: function _copyProperties (source, target) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key]
      }
    }
  }
}
