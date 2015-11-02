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
  debug: true/false,
  orgId: '<org id>',
  appId: '<app id>',
  libraryPathPattern: 'node_modules' // Regex pattern used to determine whether a file is a library file or not.
});

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
      debug: true/false,
      orgId: '<org id>',
      appId: '<app id>',
      libraryPathPattern: 'node_modules'
    })

    $opbeatProvider.install()
  })
```


## License
MIT
