# Opbeat.js

[![Build status](https://travis-ci.org/opbeat/opbeat-js.svg?branch=master)](https://travis-ci.org/opbeat/opbeat-js)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

Opbeat.js is the official JavaScript module for Opbeat. This module enables framework-specific performance metrics of your client-side application and automatic exception collection.

## Installation

Include this `<script>` before your application:

```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/2/opbeat.min.js" data-app-id="<APPID>" data-org-id="<ORGID>"></script>
```
Or install using npm

```
npm install opbeat-js
```
And include it in your application:

```html
<script src="node_modules/opbeat-js/dist/opbeat.min.js" data-app-id="<APPID>" data-org-id="<ORGID>"></script>
```

Note: You can use module loader/bundler of your choosing.

## Configuration

Our default configuration is declarative by using data-attributes. For more advanced configurations we also have a JavaScript API:

#### Configuration via JavaScript API


```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/2/opbeat.min.js"></script>
<script>

    _opbeat = window._opbeat || function() {
      (window._opbeat.q = window._opbeat.q || []).push(arguments)
    };

    _opbeat('config', {
      debug: true/false, // Toggles debug-mode, that outputs debug messages to the console
      orgId: '<ORGID>', // Your Opbeat org id
      appId: '<APPID>', // Your Opbeat app id
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

## Framework-specific performance metrics

We provide framework specific performance metrics. This means that you need to load opbeat-js build that is relevant to your framework. You can find framework-specific builds in our release

### AngularJS integration

```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/2/angular-opbeat.min.js"></script>
```

```javascript
angular.module('app', ['ngOpbeat'])
  .config(function ($opbeatProvider) {
    $opbeatProvider.config({
      debug: true/false, // Toggles debug-mode, that outputs debug messages to the console
      orgId: '<ORGID>', // Your Opbeat org id
      appId: '<APPID>', // Your Opbeat app id
      libraryPathPattern: '(node_modules|bower_components|webpack)', // Regex pattern used to determine whether a file is a library file or not.
      performance: {
        enable: true/false // Toggles performance monitoring
        enableStackFrames: true/false // Toggles whether stack frames should be generated for traces
      }
    })
  })
```

Note: Currently we support ngRoute and ui.router for "Route change" performance metric.

### Adding user context

You can add information about the logged in user to errors like this:

```js
angular.module('app', ['ngOpbeat'])
  .run(function ($opbeat) {

    $opbeat.setUserContext({
        username: "{{ user_name }}",
        email: "{{ user_email }}",
        id: "{{ user_id }}"
    })

  })
```
#### Supported AngularJS versions

Our AngularJS agent is tested with AngularJS 1.2.x, 1.3.x and 1.4.x releases.


## License
MIT
