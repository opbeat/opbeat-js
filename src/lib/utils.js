module.exports = {
  getViewPortInfo: function getViewPort () {
    var e = document.documentElement
    var g = document.getElementsByTagName('body')[0]
    var x = window.innerWidth || e.clientWidth || g.clientWidth
    var y = window.innerHeight || e.clientHeight || g.clientHeight

    return {
      width: x,
      height: y
    }
  },

  mergeObject: function (o1, o2) {
    var a
    var o3 = {}

    for (a in o1) {
      o3[a] = o1[a]
    }

    for (a in o2) {
      o3[a] = o2[a]
    }

    return o3
  },

  isUndefined: function (obj) {
    return (typeof obj) === 'undefined'
  },

  getCurrentScript: function () {
    // Source http://www.2ality.com/2014/05/current-script.html
    return document.currentScript || (function () {
        var scripts = document.getElementsByTagName('script')
        return scripts[scripts.length - 1]
      })()
  },

  promiseAny: function (arrayOfPromises) {
    if (!arrayOfPromises || !(arrayOfPromises instanceof Array)) {
      throw new Error('Must pass Promise.any an array')
    }

    if (arrayOfPromises.length === 0) {
      return Promise.resolve([])
    }

    // For each promise that resolves or rejects,
    // make them all resolve.
    // Record which ones did resolve or reject
    var resolvingPromises = arrayOfPromises.map(function (promise) {
      return promise.then(function (result) {
        return {
          resolve: true,
          result: result
        }
      }, function (error) {
        return {
          resolve: false,
          result: error
        }
      })
    })

    return Promise.all(resolvingPromises).then(function (results) {
      // Count how many passed/failed
      var passed = [], failed = [], allFailed = true
      results.forEach(function (result) {
        if (result.resolve) {
          allFailed = false
        }
        passed.push(result.resolve ? result.result : null)
        failed.push(result.resolve ? null : result.result)
      })

      return passed

    })

  }

}
