;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return (root.Opbeat = factory())
    })
  } else {
    root.Opbeat = factory()
  }
}(this, function () {
  var defaultOptions = {
    apiHost: 'https://opbeat.com',
    logger: 'javascript',
    collectHttp: true,
    ignoreErrors: [],
    ignoreUrls: [],
    whitelistUrls: [],
    includePaths: [],
    collectWindowErrors: true,
    extra: {
      frame_info: {}
    }
  }

  function Opbeat () {
    this.VERSION = '0.0.1'

    this.isInstalled = false
    this.options = defaultOptions
  }

  /*
   * Configure Opbeat with Opbeat.com credentials and other options
   *
   * @param {object} options Optional set of of global options
   * @return {Opbeat}
   */

  Opbeat.prototype.config = function (options) {
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
    if (isPlatformSupport() && !this.isInstalled) {
      TraceKit.report.subscribe(onTraceKitReport.bind(this))
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

  // Privates

  var onTraceKitReport = function () {
    console.log('onTraceKitReport', arguments)

  }

  var isPlatformSupport = function () {
    // TODO: Add some platform checks
    return true

  }

  return new Opbeat()

}))
