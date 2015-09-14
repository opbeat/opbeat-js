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
    this.options = defaultOptions
  }

  return {}

}))
