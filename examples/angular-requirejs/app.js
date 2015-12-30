// Inject angular dependencies
var app = angular.module('app', [
  'ngOpbeat'
]);

app.config(function ($opbeatProvider) {
  console.log("opbeat version: "+ $opbeatProvider.version)
  $opbeatProvider.config({
    angularAppName: 'app',
    debug: true,
    orgId: '<my_org_id>',
    appId: '<my_app_id>'
  })
});
