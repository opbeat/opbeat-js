function setup () {
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
