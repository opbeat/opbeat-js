function setup () {
  function logError (e) {
    console.log(e)
  }

  var utils = {
    loadDependencies: function loadDependencies (dependencies, callback) {
      var promises = dependencies.map(function (d) {
        return System.import(d)
      })

      return Promise.all(promises).then(function (modules) {
        console.log('Dependencies resolved.')
        callback(modules)
        return modules
      }, logError)
    },
    loadFixture: function loadFixture (fixtureUrl) {
      console.log('Loading fixture')
      var p = System.import(fixtureUrl).then(function () {}, logError)
      return p
    },
    getNextTransaction: function getNextTransaction (cb) {
      var cancelFn = window.e2e.transactionService.subscribe(function (tr) {
        cb(tr)
        cancelFn()
      })
    }
  }

  window.loadDependencies = utils.loadDependencies
  window.loadFixture = utils.loadFixture
  window.getNextTransaction = utils.getNextTransaction

  window.__httpInterceptor = {
    requests: []
  }
  var _XHR = window.XMLHttpRequest
  window.XMLHttpRequest = function () {
    var xhr = new _XHR()
    var originalOpen = xhr.open
    var lastMethod
    var lastURL
    xhr.open = function () {
      lastMethod = arguments[0]
      lastURL = arguments[1]
      originalOpen.apply(xhr, arguments)
    }

    // var originalSend = xhr.send
    // xhr.send = function(){
    //   return originalSend.apply(xhr, arguments)
    // }

    xhr.addEventListener('load', function () {
      window.__httpInterceptor.requests.push({
        requestedMethod: lastMethod.toUpperCase(),
        requestedURL: lastURL,
        xhr: this
      })
    })
    return xhr
  }
}

setup()
