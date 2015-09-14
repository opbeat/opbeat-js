// Configure client
Opbeat.config({
    orgId: '21e3157338024d01bcd23d554436497c',
    appId: 's2c204094d'
}).install();

// Set optional user data
Opbeat.setUserContext({
    email: 'vanja@opbeat.com',
    id: 1
})

// Test functions
function multiply(a, b) {
    "use strict";
    return a * b;
}

function divide(a, b) {
    "use strict";
    try {
        return multiply(add(a, b), a, b) / c;
    } catch (e) {
        Opbeat.captureException(e);
    }
}