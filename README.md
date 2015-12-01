# opbeat.js

opbeat.js is the official JavaScript agent for Opbeat. This agent enables automatic exception collection and framework-specific code instrumentation of your front-end code.

## Installation

Include this `<script>` before your main application. Typically in your <head>

```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/1/opbeat.min.js" data-app-id="<APPID>" data-org-id="<ORGID>" async></script>
```

## Configuration

Our default configuration is declarative by using data-attributes. For more advanced configurations we also have a JavaScript API:

#### Configuration via JavaScript API


```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/1/opbeat.min.js" async></script>
<script>

_opbeat = window._opbeat || function() {
  (window._opbeat.q = window._opbeat.q || []).push(arguments)
};

_opbeat('config', {
  debug: true/false, // Toggles debug-mode, that outputs debug messages to the console
  orgId: '<org id>', // Your Opbeat org id
  appId: '<app id>', // Your Opbeat app id
  libraryPathPattern: '(node_modules|bower_components|webpack)' // Regex pattern used to determine whether a file is a library file or not.
});

// Optional: Pass user data to the reported exceptions
_opbeat('setUserContext', {
  email: 'vanja@opbeat.com',
  id: 1,
  isSuperDuperAwesome: true
});

</script>
```

## Framework specific code instrumentation

In order to provide code instrumentation we have chosen a framework-specific approch. This means we'll provide builds of ``opbeat-js`` that include the specific hooks.

### angular-opbeat

```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/1/angular-opbeat.min.js"></script>
```

```javascript
angular.module('app', ['ngOpbeat'])
  .config(function ($opbeatProvider) {
    $opbeatProvider.config({
      debug: true/false, // Toggles debug-mode, that outputs debug messages to the console
      orgId: '<org id>', // Your Opbeat org id
      appId: '<app id>', // Your Opbeat app id
      libraryPathPattern: '(node_modules|bower_components|webpack)', // Regex pattern used to determine whether a file is a library file or not.
      angularAppName: '' // The name of the angular app, if booted manually
    })

    // Optional: Pass user data to the reported exceptions
    $opbeatProvider.setUserContext({
      email: 'vanja@opbeat.com',
      id: 1,
      isSuperDuperAwesome: true
    });

    $opbeatProvider.install()
  })
```

#### Pass in angular app name for manually booted applications

For Angular applications that aren't using the `ng-app` directive to boot, you need to pass in the app name via the config:

```
    $opbeatProvider.config({
      angularAppName: 'my app name'
    })
```

#### Supported AngularJS versions

Our angular-opbeat agent is tested with AngularJS 1.2.x, 1.3.x and 1.4.x releases.


## License
MIT
