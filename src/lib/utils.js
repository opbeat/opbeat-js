module.exports = {
  getViewPortInfo: function getViewPort () {
    var e = document.documentElement
    var g = document.getElementsByTagName('body')[0]
    var x = window.innerWidth || e.clientWidth || g.clientWidth
    var y = window.innerHeight || e.clientHeight || g.clientHeight

    return {
      width: x,
      height: y
    }
  },

  mergeObject: function (o1, o2) {
    var a
    var o3 = {}

    for (a in o1) {
      o3[a] = o1[a]
    }

    for (a in o2) {
      o3[a] = o2[a]
    }

    return o3
  },

  arrayReduce : function(arrayValue, callback, value) {
    if (arrayValue == null) {
      throw new TypeError('Array.prototype.reduce called on null or undefined')
    }
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function')
    }
    var t = Object(arrayValue), len = t.length >>> 0, k = 0, value;

    if (!value) {
      while (k < len && !(k in t)) {
        k++
      }
      if (k >= len) {
        throw new TypeError('Reduce of empty array with no initial value')
      }
      value = t[k++]
    }

    for (; k < len; k++) {
      if (k in t) {
        value = callback(value, t[k], k, t);
      }
    }
    return value
  },

  arraySome : function(value, callback, thisArg) {
    'use strict';

    if (value == null) {
      throw new TypeError('Array.prototype.some called on null or undefined');
    }

    if (typeof callback !== 'function') {
      throw new TypeError();
    }

    var t = Object(value)
    var len = t.length >>> 0

    if(!thisArg) {
      thisArg = void 0
    }

    for (var i = 0; i < len; i++) {
      if (i in t && callback.call(thisArg, t[i], i, t)) {
        return true
      }
    }

    return false
  },

  getRandomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },

  isUndefined: function (obj) {
    return (typeof obj) === 'undefined'
  },

  isCORSSupported: function () {
    var xhr = new window.XMLHttpRequest()
    return 'withCredentials' in xhr
  },

  getCurrentScript: function () {
    // Source http://www.2ality.com/2014/05/current-script.html
    return document.currentScript || (function () {
      var scripts = document.getElementsByTagName('script')
      return scripts[scripts.length - 1]
    })()
  },

  generateUuid: function () {
    function _p8 (s) {
      var p = (Math.random().toString(16) + '000000000').substr(2, 8)
      return s ? '-' + p.substr(0, 4) + '-' + p.substr(4, 4) : p
    }
    return _p8() + _p8(true) + _p8(true) + _p8()
  }

}
