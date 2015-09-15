require('TraceKit')
var exceptionist = require('./lib/exceptionist')
var logger = require('./lib/logger')

var defaultOptions = {
  organizationId: 'b3eba3d11f6e4c3a9db52f477caa4fa2',
  appId: 'e9797db8c7',
  clientToken: '6451721d51b6d95cf6c6b09498feafd865f1f976'
}
var utils = require('./lib/utils')

function Opbeat () {
  this.VERSION = '0.0.1'

  this.isInstalled = false
  this.options = defaultOptions
  this.options.VERSION = this.VERSION

  this.isPlatformSupport = function () {
    return typeof Array.prototype.forEach === 'function' &&
      typeof JSON.stringify === 'function'

  }

  this.onTraceKitReport = function (stackInfo) {
    logger.log('opbeat.onTraceKitReport', stackInfo)

    var exception = exceptionist.traceKitStackToOpbeatException(stackInfo, this.options)

    exceptionist.processException(exception, this.options)
  }

}

/*
 * Configure Opbeat with Opbeat.com credentials and other options
 *
 * @param {object} options Optional set of of global options
 * @return {Opbeat}
 */

Opbeat.prototype.config = function (options) {
  this.options = utils.mergeObject(this.options, options)
  return this
}

/*
 * Installs a global window.onerror error handler
 * to capture and report uncaught exceptions.
 * At this point, install() is required to be called due
 * to the way TraceKit is set up.
 *
 * @return {Opbeat}
 */

Opbeat.prototype.install = function () {
  if (this.isPlatformSupport() && !this.isInstalled) {
    TraceKit.report.subscribe(this.onTraceKitReport.bind(this))
    this.isInstalled = true
  }

  return this

}

/*
 * Uninstalls the global error handler.
 *
 * @return {Opbeat}
 */
Opbeat.prototype.uninstall = function () {
  TraceKit.report.uninstall()
  this.isInstalled = false

  return this
}

/*
 * Manually capture an exception and send it over to Opbeat.com
 *
 * @param {error} ex An exception to be logged
 * @param {object} options A specific set of options for this error [optional]
 * @return {Opbeat}
 */
Opbeat.prototype.captureException = function (ex, options) {
  if (!(ex instanceof Error)) {
    throw 'Passed exception needs to be an instanceof Error'
  }

  // TraceKit.report will re-raise any exception passed to it,
  // which means you have to wrap it in try/catch. Instead, we
  // can wrap it here and only re-raise if TraceKit.report
  // raises an exception different from the one we asked to
  // report on.

  try {
    TraceKit.report(ex, options)
  } catch(ex1) {
    if (ex !== ex1) {
      throw ex1
    }
  }

  return this
}

/*
 * Set/clear a user to be sent along with the payload.
 *
 * @param {object} user An object representing user data [optional]
 * @return {Opbeat}
 */
Opbeat.prototype.setUserContext = function (user) {
  return this
}

/*
 * Set extra attributes to be sent along with the payload.
 *
 * @param {object} extra An object representing extra data [optional]
 * @return {Opbeat}
 */
Opbeat.prototype.setExtraContext = function (extra) {
  return this
}

module.exports = new Opbeat()
