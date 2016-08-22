function setup () {
  if (!window.console) {
    window.console = {}
  }
  if (!console.log) {
    console.log = function () {}
  }

  function logError (e) {
    console.log(e)
  }

  function importDependencies (dependencies) {
    var promises = dependencies.map(function (d) {
      return System.import(d)
    })

    return Promise.all(promises)
      .then(function (resolvedDependencies) {
        return resolvedDependencies
      }, logError)
  }

  function sequentialImport (dependencies) {
    var results = []
    return dependencies
      .reduce(function (p, dep) {
        return p.then(function () {
          if (typeof dep === 'string') {
            return System.import(dep).then(function (r) {
              results.push(r)
              return results
            }, logError)
          } else {
            return importDependencies()
              .then(function (rs) {
                results = results.concat(rs)
                return results
              }, logError)
          }
        })
      }, Promise.resolve())
  }

  var utils = {
    loadDependencies: function loadDependencies (dependencies, callback) {
      var promise = sequentialImport(dependencies)
      return promise.then(function (modules) {
        console.log('Dependencies resolved.')
        if (typeof callback === 'function') {
          callback(modules)
        }
        return modules
      }, logError)
    },
    loadFixture: function loadFixture (fixtureUrl) {
      console.log('Loading fixture')
      var p = System.import(fixtureUrl).then(function () {}, logError)
      return p
    },
    runFixture: function runFixture (path, deps, options) {
      var div = document.createElement('div')
      if (options.useNgApp) {
        div.setAttribute('ng-app', options.appName)
        window.name = 'NG_DEFER_BOOTSTRAP!' + window.name
      }

      if (options.uiRouter) {
        div.innerHTML = '<div ui-view></div>'
      } else {
        div.innerHTML = '<div ng-view></div>'
      }
      document.body.appendChild(div)
      System.import(path).then(function (module) {
        utils.loadDependencies(deps, function (modules) {
          var useNgApp = options.useNgApp
          // if (typeof useNgApp === 'undefined') {
          //   useNgApp = (window.angular.version.major >= 1 && window.angular.version.minor >= 3)
          // }
          if (options.beforeInit) {
            options.beforeInit(module, modules)
          } else {
            module.init(options.opbeatConfig)
          }

          if (useNgApp) {
            console.log('using ngapp')
            window.angular.resumeBootstrap()
          } else {
            module.bootstrap(document)
          }
        })
      }, logError)
    },
    getNextTransaction: function getNextTransaction (cb) {
      var cancelFn = window.e2e.transactionService.subscribe(function (tr) {
        cb(tr)
        cancelFn()
      })
    }
  }

  window.loadDependencies = utils.loadDependencies
  window.loadFixture = utils.loadFixture
  window.getNextTransaction = utils.getNextTransaction
  window.runFixture = utils.runFixture

  // config systemjs
  window.System.config({
    paths: {
      '*': '/node_modules/*',
      'zone.js': '/node_modules/zone.js/dist/zone.js'
    },
    meta: {
      './app.js': {
        format: 'cjs'
      },
      '../../dist/dev/opbeat-angular.e2e.js': {
        format: 'cjs'
      },
      '../../dist/dev/opbeat-angular.e2e.min.js': {
        format: 'cjs'
      }
    },
    packageConfigPaths: ['/node_modules/*/package.json'],
    'defaultJSExtensions': true
  })
}

setup()
