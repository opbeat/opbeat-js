/*global angular */

/**
 * The main TodoMVC app module
 *
 * @type {angular.Module}
 */
angular.module('todomvc', ['ngRoute', 'ngResource', 'ngOpbeat'])
  .config(function ($routeProvider) {
    'use strict'
    var routeConfig = {
      controller: 'TodoCtrl',
      templateUrl: 'todomvc-index.html',
      resolve: {
        store: function (todoStorage) {
          // Get the correct module (API or localStorage).
          return todoStorage.then(function (module) {
            module.get(); // Fetch the todo records in the background.
            return module
          })
        }
      }
    }

    $routeProvider
      .when('/', routeConfig)
      .when('/:status', routeConfig)
      .otherwise({
        redirectTo: '/'
      })
  })
  .config(function ($opbeatProvider) {
    $opbeatProvider.config({
      debug: true,
      orgId: '7f9fa667d0a349dd8377bc740bcfc33e',
      appId: '0a8757798e',
      performance: {
        enable: true,
        enableStackFrames: true
      }
    })
  })
