// Test functions
function multiply (a, b) {
  'use strict'
  return a * b
}

function divide (a, b) {
  'use strict'
  try {
    return multiply(add(a, b), a, b) / c
  } catch (e) {
    _opbeat('captureException', e)
  }
}

document.querySelector('.btn-test4').addEventListener('click', function () {
  divide(123 / 2)
}, false)
