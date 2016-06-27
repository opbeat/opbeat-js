var Subscription = require('../common/subscription')
var patchUtils = require('../patching/patchUtils')
var opbeatTaskSymbol = patchUtils.opbeatSymbol('taskData')

var urlSympbol = patchUtils.opbeatSymbol('url')
var methodSymbol = patchUtils.opbeatSymbol('method')

var XMLHttpRequest_send = 'XMLHttpRequest.send'
var XHR = window.XMLHttpRequest

function ZoneService (zone, logger, config) {
  this.events = new Subscription()

  var nextId = 0

  this.events = new Subscription()
  // var zoneService = this
  function noop () { }
  var spec = this.spec = {
    onScheduleTask: noop,
    onBeforeInvokeTask: noop,
    onInvokeTask: noop,
    onCancelTask: noop,
    onHandleError: noop
  }

  var zoneConfig = {
    name: 'opbeatRootZone',
    onScheduleTask: function (parentZoneDelegate, currentZone, targetZone, task) {
      var taskId = nextId++
      if (task.type === 'macroTask') {
        var opbeatTask = {
          taskId: task.source + taskId,
          source: task.source,
          type: task.type,
          data: {
            target: task.data.target
          }
        }

        if (task.source === 'setTimeout') {
          if (task.data.args[1] === 0) {
            task[opbeatTaskSymbol] = opbeatTask
            spec.onScheduleTask(opbeatTask)
          }
        } else if (task.source === 'requestAnimationFrame') {
          task[opbeatTaskSymbol] = opbeatTask
          spec.onScheduleTask(opbeatTask)
        } else if (task.source === XMLHttpRequest_send) {
          /*
                  "XMLHttpRequest.addEventListener:load"
                  "XMLHttpRequest.addEventListener:error"
                  "XMLHttpRequest.addEventListener:abort"
                  "XMLHttpRequest.send"
                  "XMLHttpRequest.addEventListener:readystatechange"
          */
          opbeatTask['XHR'] = {
            'load': false,
            'readystatechange': false,
            'send': false,
            url: task.data.target[urlSympbol],
            method: task.data.target[methodSymbol]
          }

          task[opbeatTaskSymbol] = task.data.target[opbeatTaskSymbol] = opbeatTask

          spec.onScheduleTask(opbeatTask)
        }
      }

      var delegateTask = parentZoneDelegate.scheduleTask(targetZone, task)
      return delegateTask
    },
    onInvokeTask: function (parentZoneDelegate, currentZone, targetZone, task, applyThis, applyArgs) {
      var result
      if (task.data && task.data.target && XHR === task.data.target.constructor) {
        var opbeatTask = task.data.target[opbeatTaskSymbol]

        if (opbeatTask && task.data.eventName === 'readystatechange' && task.data.target.readyState === XHR.DONE) {
          opbeatTask.XHR['readystatechange'] = true
          spec.onBeforeInvokeTask(opbeatTask)
        } else if (opbeatTask && task.data.eventName === 'load') {
          opbeatTask.XHR['load'] = true
        } else if (opbeatTask && task.source === XMLHttpRequest_send) {
          opbeatTask.XHR['send'] = true
        }

        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        if (opbeatTask && opbeatTask.XHR['load'] && opbeatTask.XHR['readystatechange'] && opbeatTask.XHR['send']) {
          spec.onInvokeTask(opbeatTask)
        }
      } else if (task[opbeatTaskSymbol] && (task.source === 'requestAnimationFrame' || task.source === 'setTimeout')) {
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        spec.onInvokeTask(task[opbeatTaskSymbol])
      } else {
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
      }
      return result
    },
    onCancelTask: function (parentZoneDelegate, currentZone, targetZone, task) {
      var opbeatTask
      if (task.type === 'macroTask') {
        if (task.source === XMLHttpRequest_send) {
          opbeatTask = task.data.target[opbeatTaskSymbol]
          spec.onCancelTask(opbeatTask)
        } else if (task[opbeatTaskSymbol] && (task.source === 'requestAnimationFrame' || task.source === 'setTimeout')) {
          opbeatTask = task[opbeatTaskSymbol]
          spec.onCancelTask(opbeatTask)
        }
      }
      return parentZoneDelegate.cancelTask(targetZone, task)
    }
  // onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
  //   spec.onHandleError(error)
  //   parentZoneDelegate.handleError(targetZone, error)
  // }
  }

  // if (config.get('debug') === true) {
  //   zoneConfig.properties = {opbeatZoneData: {name: 'opbeatRootZone', children: []}}
  //   zoneConfig.onFork = function (parentZoneDelegate, currentZone, targetZone, zoneSpec) {
  //     var childZone = parentZoneDelegate.fork(targetZone, zoneSpec)
  //     console.log('onFork: ', arguments)
  //     console.log('onFork: ', childZone)

  //     var childZoneData = {name: childZone.name}

  //     if (targetZone._properties['opbeatZoneData']) {
  //       targetZone._properties['opbeatZoneData'].children.push(childZoneData)
  //     } else {
  //       targetZone._properties['opbeatZoneData'] = {
  //         name: targetZone.name,
  //         children: [childZoneData]
  //       }
  //     }
  //     console.log('onFork:opbeatZoneData:', targetZone._properties['opbeatZoneData'])
  //     return childZone
  //   }
  // }

  this.zone = zone.fork(zoneConfig)
}

ZoneService.prototype.set = function (key, value) {
  window.Zone.current._properties[key] = value
}
ZoneService.prototype.get = function (key) {
  return window.Zone.current.get(key)
}

ZoneService.prototype.getCurrentZone = function () {
  return window.zone
}

module.exports = ZoneService
