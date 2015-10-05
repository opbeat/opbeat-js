// Configure client
Opbeat.config({
  debug: true,
  orgId: 'b3eba3d11f6e4c3a9db52f477caa4fa2',
  appId: 'e9797db8c7',
  token: '6451721d51b6d95cf6c6b09498feafd865f1f976'
}).install()

// Set optional user data
Opbeat.setUserContext({
  email: 'vanja@opbeat.com',
  id: 1
})
