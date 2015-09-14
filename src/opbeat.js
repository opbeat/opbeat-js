;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return (root.opbeat = factory())
    })
  } else {
    root.opbeat = factory()
  }
}(this, function () {
  // Opbeat factory

  function Opbeat () {
  }

  return {}

}))
