var Promise = require('es6-promise').Promise
var SimpleCache = require('simple-lru-cache')
var transport = require('./transport')

var cache = new SimpleCache({
  'maxSize': 1000
})

var fetchQueue = {}

var getFileFromNetwork = function (url) {
  return new Promise(function (resolve, reject) {
    if (fetchQueue[url]) {
      fetchQueue[url].push(resolve)
      return
    }

    fetchQueue[url] = []

    transport.getFile(url).then(function (source) {
      cache.set(url, source)
      resolve(source)

      if (fetchQueue[url]) {
        fetchQueue[url].forEach(function (fn) {
          fn()
        })
      }
      fetchQueue[url] = null
    }, function (err) {
      fetchQueue[url] = null
      reject(err)
    })
  })
}

var getFileFromCache = function (url, missCallback) {
  return new Promise(function (resolve, reject) {
    var cachedSource = cache.get(url)
    if (cachedSource) {
      resolve(cachedSource)
    } else {
      reject()
    }
  })
}

module.exports = {

  getFile: function (url) {
    return new Promise(function (resolve, reject) {
      getFileFromCache(url).then(function (fileSource) { // Try to get from cache
        resolve(fileSource)
      }, function () {
        getFileFromNetwork(url).then(function (fileSource) { // then try network
          resolve(fileSource)
        }, reject) // give up
      })
    })
  }
}
