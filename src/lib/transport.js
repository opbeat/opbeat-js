var logger = require('./logger')
var config = require('./config')
var Promise = require('bluebird')

module.exports = {
  sendToOpbeat: function (data) {
    logger.log('opbeat.transport.sendToOpbeat', data)

    var url = 'https://' + config.get('apiHost') + '/api/v1/organizations/' + config.get('orgId') + '/apps/' + config.get('appId') + '/client-side/errors/'

    var headers = {
      'Authorization': 'Bearer ' + config.get('token'),
      'X-Opbeat-Client': 'opbeat-js/' + config.get('VERSION')
    }

    return _makeRequest(url, 'POST', 'JSON', data, headers)
  },

  getFile: function (fileUrl) {
    return _makeRequest(fileUrl, 'GET', '', {})
  }
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

    logger.log('opbeat.transport._makeRequest', url, data, headers)

    xhr.onreadystatechange = function (evt) {
      if (xhr.readyState === 4) {
        var status = xhr.status
        if (status > 399 && status < 600) {
          // An http 4xx or 5xx error. Signal an error.
          var err = new Error(url + ' HTTP status: ' + status)
          err.xhr = xhr
          reject(err)
          logger.log('opbeat.transport.error', err)
        } else {
          resolve(xhr.responseText)
          logger.log('opbeat.transport.success')
        }
      }
    }

    xhr.onerror = function (e) {
      reject(e)
      logger.log('opbeat.transport.error', e)
    }

    if (type === 'JSON') {
      xhr.send(JSON.stringify(data))
    } else {
      xhr.send(data)
    }

  })

}
