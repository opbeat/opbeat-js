# Opbeat.js

Opbeat.js is the official JavaScript/frontend agent for Opbeat. This agent enables automatic exception collection and framework-specific code instrumentation of your front-end code.

## Installation 

Include this `<script>` before your main application. Typically in your <head>

```html
<script src="https://cdn.opbeat.com/0.0.1/opbeat.min.js"></script>
```

## Configuration

We support a minimal configuration-mode by using data-attributes, and a Javascritp API:

#### Minimal configuration

```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/1/opbeat.min.js" data-app-id="<APPID>" data-org-id="<ORGID>"></script>
```

#### Configuration via JavaScript API


```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/1/opbeat.min.js"></script>
<script>
// Configure client
Opbeat.config({
  debug: true,
  orgId: '<orgid>',
  appId: '<appid>'
}).install()

// Set optional user data
Opbeat.setUserContext({
  email: '<email>'
  id: '<id>',
  userProp1: true
})
</script>
```

## Framework specific code instrumentation

In order to provide code instrumentation we have chosen a framework-specific approch. This means we'll provide builds of ``opbeat-js`` that include the specific hooks.

### angular-opbeat


```html
<script src="https://d3tvtfb6518e3e.cloudfront.net/1/angular-opbeat.min.js"></script>
```

```javascript 
/*global angular */

/**
 * The main TodoMVC app module
 *
 * @type {angular.Module}
 */
angular.module('app', ['ngOpbeat'])
  
  ...
  
  .config(function ($opbeatProvider) {
    $opbeatProvider.config({
      debug: true,
      orgId: 'b3eba3d11f6e4c3a9db52f477caa4fa2',
      appId: 'a7971dbd71'
    })

    $opbeatProvider.install()
  })
```


## License
MIT
