function ZoneServiceMock () {
  function noop () { }

  this.spec = {
    onScheduleTask: noop,
    onInvokeTask: noop,
    onCancelTask: noop
  }

  this.get = function (key) {
    return this.zone[key]
  }
  this.set = function (key, value) {
    this.zone[key] = value
  }
  this.runOuter = function (fn) {
    return fn()
  }
  this.zone = {run: function(fn) { return fn()}}
}
module.exports = ZoneServiceMock
