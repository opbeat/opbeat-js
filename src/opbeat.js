;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return (root.Opbeat = factory())
    })
  } else {
    root.Opbeat = factory()
  }
}(this, function () {
  // Opbeat factory

  function Opbeat () {
  }

  return {}

}))
