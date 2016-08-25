var logger = require('../lib/logger')
var API = require('../lib/api')

var ServiceFactory = require('../common/serviceFactory')

function Opbeat () {
  this._serviceFactory = new ServiceFactory()

  this._config = this._serviceFactory.getConfigService()

  var queuedCommands = []
  if (window._opbeat) {
    queuedCommands = window._opbeat.q
  }
  this.api = new API(this, queuedCommands)
  window._opbeat = this.api.push

  this.install()
}

Opbeat.prototype.VERSION = '%%VERSION%%'

Opbeat.prototype.isPlatformSupported = function () {
  return this._config.isPlatformSupported()
}

/*
 * Configure Opbeat with Opbeat.com credentials and other options
 *
 * @param {object} options Optional set of of global options
 * @return {Opbeat}
 */
Opbeat.prototype.config = function (properties) {
  if (properties) {
    this._config.setConfig(properties)
  }

  this.install()

  return this._config
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
  if (!this._config.isValid()) {
    logger.warning('opbeat.install.config.invalid')
    return this
  }

  if (!this.isPlatformSupported()) {
    logger.warning('opbeat.install.platform.unsupported')
    return this
  }

  if (this._config.get('isInstalled')) {
    logger.warning('opbeat.install.already.installed')
    return this
  }

  this._exceptions = this._exceptionHandler = this._serviceFactory.getExceptionHandler()

  this._exceptions.install()
  this._config.set('isInstalled', true)

  return this
}

/*
 * Uninstalls the global error handler.
 *
 * @return {Opbeat}
 */
Opbeat.prototype.uninstall = function () {
  this._exceptions.uninstall()
  this._config.set('isInstalled', false)

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
  if (!this._config.get('isInstalled')) {
    logger.error("Can't capture exception. Opbeat isn't intialized")
    return this
  }

  if (!(ex instanceof Error)) {
    logger.error("Can't capture exception. Passed exception needs to be an instanceof Error")
    return this
  }

  // TraceKit.report will re-raise any exception passed to it,
  // which means you have to wrap it in try/catch. Instead, we
  // can wrap it here and only re-raise if TraceKit.report
  // raises an exception different from the one we asked to
  // report on.

  this._exceptions.processError(ex, options)

  return this
}

/*
 * Set/clear a user to be sent along with the payload.
 *
 * @param {object} user An object representing user data [optional]
 * @return {Opbeat}
 */
Opbeat.prototype.setUserContext = function (user) {
  this._config.set('context.user', user)

  return this
}

/*
 * Set extra attributes to be sent along with the payload.
 *
 * @param {object} extra An object representing extra data [optional]
 * @return {Opbeat}
 */
Opbeat.prototype.setExtraContext = function (extra) {
  this._config.set('context.extra', extra)

  return this
}

module.exports = new Opbeat()
