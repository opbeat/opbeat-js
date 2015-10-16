// Configure client
var OpbeatJS = Opbeat.noConflict()

OpbeatJS.config({
  debug: true,
  orgId: 'b3eba3d11f6e4c3a9db52f477caa4fa2',
  appId: 'e9797db8c7'
}).install()

// Set optional user data
OpbeatJS.setUserContext({
  email: 'vanja@opbeat.com',
  id: 1
})

console.log('OpbeatJS', OpbeatJS)
console.log('Opbeat', Opbeat)
