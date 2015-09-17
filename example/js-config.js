// Configure client
Opbeat.config({
  orgId: 'b3eba3d11f6e4c3a9db52f477caa4fa2',
  appId: 'e9797db8c7',
  token: '6451721d51b6d95cf6c6b09498feafd865f1f976'
}).install()

// Set optional user data
Opbeat.setUserContext({
  email: 'vanja@opbeat.com',
  id: 1
})

// Test functions
function multiply (a, b) {
  return a * b
}

function divide (a, b) {
  return multiply(add(a, b), a, b) / c
}

document.querySelector('.btn-test4').addEventListener('click', function () {
  divide(123 / 2)
}, false)
