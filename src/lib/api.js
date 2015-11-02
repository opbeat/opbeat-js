function api (opbeat, queuedCommands) {
  this.q = []

  this.opbeat = opbeat
  this.execute = this.execute.bind(this)
  this.push = this.push.bind(this)

  if (queuedCommands) {
    queuedCommands.forEach(function (cmd) {
      this.push.apply(this, cmd)
    }.bind(this))
  }
}

api.prototype.execute = function (cmd, args) {
  return this.opbeat[cmd].apply(this.opbeat, args)
}

api.prototype.push = function () {
  var argsArray = Array.prototype.slice.call(arguments)

  var cmd = argsArray.slice(0, 1)[0]
  var args = argsArray.slice(1)

  this.execute(cmd, args)
}

module.exports = api
