var config = require('./config')

function apiQueue(opbeat, queuedCommands) {

  this.q = []

  this.opbeat = opbeat
  this.execute = this.execute.bind(this)
  this.push = this.push.bind(this)

  if(queuedCommands) {
    queuedCommands.forEach(function(cmd) {
      this.push.apply(this, cmd)
    }.bind(this));
  }

}

apiQueue.prototype.execute = function(cmd, args) {
  console.log('apiQueue', cmd, args);
  return this.opbeat[cmd].apply(this.opbeat, args)
}

apiQueue.prototype.push = function() {
  var argsArray = Array.prototype.slice.call(arguments);

  var cmd = argsArray.slice(0, 1)[0]
  var args = argsArray.slice(1)

  this.execute(cmd, args)
}

module.exports = apiQueue
