function ZoneServiceMock () {
  this.zone = {}
  this.get = function (key) {
    return this.zone[key]
  }
  this.set = function (key, value) {
    this.zone[key] = value
  }
}
module.exports = ZoneServiceMock
