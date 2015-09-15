var logger = require('./logger')

module.exports = {
  sendToOpbeat: function (data, options) {
    logger.log('opbeat.transport.sendToOpbeat', data, options)

    var url = 'https://intake.opbeat.com/api/v1/organizations/' + options.organizationId + '/apps/' + options.appId + '/errors/'
    var data = {

    }

    var headers = {
      'Authorization': 'Bearer ' + options.clientToken,
      'x-opbeat-client': 'opbeat-js/' + options.VERSION,
    }

    this._makeRequest(url, data, headers)
  },

  _makeRequest: function (url, data, headers) {
    var xhr = this._createCORSRequest('POST', url, data)

    if (!xhr) {
      logger.log('opbeat.transport.error.cors-not-supported')
      return
    }

    if (headers) {
      for (header in headers) {
        if (headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header.toLowerCase(), headers[header])
        }
      }
    }

    if (window.XDomainRequest) {
      // Empty event handlers needs to be there, because IE9 is flawed: http://rudovsky.blogspot.dk/2012/09/microsoft-shit-xdomainrequest.html
      xhr.ontimeout = function () {}
      xhr.onprogress = function () {}
    }

    xhr.onreadystatechange = function (evt) {
      var status, err
      if (xhr.readyState === 4) {
        status = xhr.status
        if (status > 399 && status < 600) {
          // An http 4xx or 5xx error. Signal an error.
          var err = new Error(url + ' HTTP status: ' + status)
          err.xhr = xhr
          logger.log('opbeat.transport.error', err)
        } else {
          logger.log('opbeat.transport.success')
        }
      }
    }

    xhr.onerror = function (e) {
      logger.log('opbeat.transport.error', e)
    }

    logger.log('opbeat.transport._makeRequest', url, data, headers)

    xhr.send(data)

  },

  _createCORSRequest: function (method, url) {
    var xhr = new window.XMLHttpRequest()

    if ('withCredentials' in xhr) {
      xhr.open(method, url, true)
    } else if (window.XDomainRequest) {
      xhr = new window.XDomainRequest()
      xhr.open(method, url, true)
    }

    xhr.timeout = 10000

    return xhr
  }

}
