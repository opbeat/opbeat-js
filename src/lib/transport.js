var logger = require('./logger')
var config = require('./config')

module.exports = {
  sendError: function (data, headers) {
    return _sendToOpbeat('errors', data, headers)
  },

  sendTransaction: function (data, headers) {
    return _sendToOpbeat('transactions', data, headers)
  },

  getFile: function (fileUrl) {
    return _makeRequest(fileUrl, 'GET', '', {})
  }
}

function _sendToOpbeat (endpoint, data, headers) {
  logger.log('opbeat.transport.sendToOpbeat', data)

  var url = 'https://' + config.get('apiHost') + '/api/v1/organizations/' + config.get('orgId') + '/apps/' + config.get('appId') + '/client-side/' + endpoint + '/'

  return _makeRequest(url, 'POST', 'JSON', data, headers)
}

function _makeRequest (url, method, type, data, headers) {
  return new Promise(function (resolve, reject) {
    var xhr = new window.XMLHttpRequest()

    xhr.open(method, url, true)
    xhr.timeout = 10000

    if (type === 'JSON') {
      xhr.setRequestHeader('Content-Type', 'application/json')
    }

    if (headers) {
      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header.toLowerCase(), headers[header])
        }
      }
    }

    xhr.onreadystatechange = function (evt) {
      if (xhr.readyState === 4) {
        var status = xhr.status
        if (status === 0 || status > 399 && status < 600) {
          // An http 4xx or 5xx error. Signal an error.
          var err = new Error(url + ' HTTP status: ' + status)
          err.xhr = xhr
          reject(err)
          logger.log('opbeat.transport.makeRequest.error', err)
        } else {
          resolve(xhr.responseText)
          logger.log('opbeat.transport.makeRequest.success')
        }
      }
    }

    xhr.onerror = function (err) {
      reject(err)
      logger.log('opbeat.transport.makeRequest.error', err)
    }

    if (type === 'JSON') {
      data = JSON.stringify(data)
    }

    xhr.send(data)
  })
}
