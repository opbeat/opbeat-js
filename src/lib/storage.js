module.exports = {

	set: function(key, val) {
    window.localStorage.setItem(key, JSON.stringify(val));
    return val;
  },

  get: function(key) {
    var value = window.localStorage.getItem(key);
    if (typeof value != 'string') {
    	return undefined
    }

    try {
    	return JSON.parse(value)
    }
    catch(e) {
    	return value || undefined
    }
  }
}
