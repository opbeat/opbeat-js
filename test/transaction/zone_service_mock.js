function ZoneServiceMock () {
  function noop () { }

  this.spec = {
    onAddTask: noop,
    onRemoveTask: noop,
    onDetectFinish: noop
  }

  this.zone = {}
  this.get = function (key) {
    return this.zone[key]
  }
  this.set = function (key, value) {
    this.zone[key] = value
  }
}
module.exports = ZoneServiceMock
