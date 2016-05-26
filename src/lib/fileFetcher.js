var SimpleCache = require('simple-lru-cache')
var transport = require('./transport')

var cache = new SimpleCache({
  'maxSize': 1000
})

module.exports = {
  getFile: function (url) {
    var cachedPromise = cache.get(url)
    if (typeof cachedPromise !== 'undefined') {
      return cachedPromise
    }
    var filePromise = transport.getFile(url)
    cache.set(url, filePromise)
    return filePromise
  }
}
