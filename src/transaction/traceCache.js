var SimpleCache = require('simple-lru-cache')

module.exports = new SimpleCache({
  'maxSize': 5000
})
