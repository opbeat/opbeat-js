function Notifier () {
  this.queue = {}
}
Notifier.prototype.set = function (key, value) {
  this.queue[key] = value
  this.notify(this)
}
Notifier.prototype.remove = function (key) {
  delete this.queue[key]
  this.notify(this)
}
Notifier.prototype.notify = function () {}
Notifier.prototype.count = function () {
  return Object.keys(this.queue).length
}
