/*eslint-disable */

var fs = require('fs')
var gulp = require('gulp')
var source = require('vinyl-source-stream')
var rename = require('gulp-rename')
var browserify = require('browserify')
var buffer = require('vinyl-buffer')
var uglify = require('gulp-uglify')
var taskListing = require('gulp-task-listing')
var awspublish = require('gulp-awspublish')
var injectVersion = require('gulp-inject-version')
var derequire = require('gulp-derequire')
var es = require('event-stream')
var karma = require('karma')
var runSequence = require('run-sequence')
var webdriver = require('gulp-webdriver')
var selenium = require('selenium-standalone')

var connect = require('gulp-connect')

require('gulp-release-tasks')(gulp)

var jeditor = require('gulp-json-editor')

// Static file server
gulp.task('server', function () {
  connect.server({
    root: ['examples', 'dist'],
    port: 7000,
    livereload: false,
    open: false,
  })
})

function createBuildStream(mainFilePath) {
  return browserify({
    entries: [mainFilePath],
    standalone: '',
    insertGlobalVars: { define: function () { return 'undefined'; }, process: function () { return 'undefined'; } }
  })
    .bundle()
    .pipe(source(mainFilePath))
    .pipe(rename({ dirname: '' }))
    .pipe(buffer())
    .pipe(injectVersion({
      replace: new RegExp(RegExp.escape('%%VERSION%%'), 'g')
    }))
    .pipe(derequire())
}

function writeToDestinations(stream, dests) {
  var tasks = dests.map(function (destPath) {
    return stream.pipe(gulp.dest(versionPath))
  })
  return es.merge.apply(null, tasks)
}


function getMajorVersion() {
  var version = require('./package').version
  var majorVersion = version.match(/^(\d).(\d).(\d)/)[1]
  return majorVersion
}

gulp.task('build:release', function () {
  var version = require('./package').version
  var majorVersion = version.match(/^(\d).(\d).(\d)/)[1]

  var versionPath = './dist/cdn/' + majorVersion
  var prodPath = './dist/'

  var integrations = [
    { name: 'opbeat-angular', entry: './src/angular/opbeat-angular.js', description: 'Official AngularJS client for logging exceptions, stacktraces and performance data to Opbeat' },
    { name: 'opbeat-js', entry: './src/opbeat.js', description: 'This is the official frontend JavaScript module for Opbeat' }
  ]

  var tasks = integrations.map(function (integration) {
    var mainStream = createBuildStream(integration.entry)
      .pipe(gulp.dest(versionPath))
      .pipe(gulp.dest(prodPath))
      .pipe(gulp.dest(prodPath + integration.name))
      .pipe(rename({
        extname: '.min.js'
      }))
      .pipe(uglify())
      .pipe(gulp.dest(versionPath))
      .pipe(gulp.dest(prodPath))
      .pipe(gulp.dest(prodPath + integration.name))

    var filename = integration.entry.split('/')
    filename = filename[filename.length - 1]

    var packagejson = gulp.src(['./release/*.json'])
      .pipe(jeditor({
        'name': integration.name,
        'version': version,
        'main': filename,
        'description': integration.description
      }))
      .pipe(gulp.dest(prodPath + integration.name))


    return es.merge.apply(null, [mainStream, packagejson, gulp.src(['./README.md', 'LICENSE']).pipe(gulp.dest(prodPath + integration.name))])
  })

  return es.merge.apply(null, tasks)
})

gulp.task('build', function () {
  var sourceTargets = [
    './src/opbeat.js',
    './src/angular/opbeat-angular.js',
    './e2e_test/angular/opbeat-angular.e2e.js'
  ]

  var tasks = sourceTargets.map(function (entry) {
    return createBuildStream(entry)
      .pipe(gulp.dest('./dist/dev/'))
      .pipe(rename({
        extname: '.min.js'
      }))
      .pipe(uglify())
      .pipe(gulp.dest('./dist/dev/'))
  })

  return es.merge.apply(null, tasks)
})

// Development mode
gulp.task('watch', [], function (cb) {
  gulp.run(
    'build',
    'server'
  )

  // Watch JS files
  gulp.watch(['libs/**', 'src/**'], function () { runSequence('build', 'karma-run') })
  console.log('\nExample site running on http://localhost:7000/\n')
})

//
// Deploy task
//
gulp.task('deploy', ['build:release'], function () {
  // Load options from file
  awsoptions = JSON.parse(fs.readFileSync('aws.json'))

  // Hardcoded bucketname, to avoid mistakes
  awsoptions.params = {
    Bucket: 'opbeat-js-cdn'
  }

  // Create new publisher
  var publisher = awspublish.create(awsoptions)

  // Set headers
  var headers = {
    'Cache-Control': 'max-age=1800, public'
  }


  var version = require('./package').version
  var majorVersion = version.match(/^(\d).(\d).(\d)/)[1]

  var versionPath = './dist/cdn/**'

  return gulp.src([versionPath])
    // Gzip
    .pipe(awspublish.gzip())
    // Publish files with headers
    .pipe(publisher.publish(headers))
    // Create a cache file to speed up consecutive uploads
    .pipe(publisher.cache())
    // Print upload updates to console
    .pipe(awspublish.reporter())
})

function runKarma(configFile, done) {
  var exec = require('child_process').exec

  var cmd = process.platform === 'win32' ? 'node_modules\\.bin\\karma run ' :
    'node node_modules/.bin/karma run '
  cmd += configFile
  exec(cmd, function (e, stdout) {
    // ignore errors, we don't want to fail the build in the interactive (non-ci) mode
    // karma server will print all test failures
    done()
  })
}

gulp.task('karma-run', function (done) {
  // run the run command in a new process to avoid duplicate logging by both server and runner from
  // a single process
  runKarma('karma.conf.js', done)
})

gulp.task('test', function (done) {
  new karma.Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start()
})

gulp.task('test:e2e', function (done) {
  var stream = gulp.src('wdio.conf.js').pipe(webdriver({
    host: 'ondemand.saucelabs.com',
    port: 80
  }))

  stream.on('error', function () { 
    return process.exit(1)
  })
  done()
})

gulp.task('test.sauce.start', function (done) {
  var sauceConnectLauncher = require('sauce-connect-launcher')

  sauceConnectLauncher({
    username: 'opbeat',
    accessKey: 'de42e589-1450-41a2-8a44-90aa00c15168'
  }, function (err, sauceConnectProcess) {
    if (err) {
      console.error(err.message)
      return
    }

    console.log('Sauce Connect ready')

    // sauceConnectProcess.close(function () {
    //   console.log('Closed Sauce Connect process')
    // })
  })
})

gulp.task('test.e2e.sauce', function (done) {
  var capabilities = [
    {
      browserName: 'chrome'
    },
    {
      browserName: 'internet explorer'
    }
  ]

  // if the e2e assets are available online
  var extraConfig = {
    user: 'opbeat',
    key: 'de42e589-1450-41a2-8a44-90aa00c15168',
    host: 'ondemand.saucelabs.com',
    port: 80,
    baseUrl: 'http://10.0.1.152:8000',
  }

  var sauceConnectConfig = {
    host: '127.0.0.1',
    port: 4445,
    user: 'opbeat',
    key: 'de42e589-1450-41a2-8a44-90aa00c15168',
    capabilities: capabilities
  }
  var stream = gulp.src('wdio.conf.js').pipe(webdriver(sauceConnectConfig))

  stream.on('error', function () { })
  done()
})

gulp.task('e2e-serve', function (done) {
  connect.server({
    root: ['e2e_test', 'src', './'],
    port: 8000,
    livereload: false,
    open: false,
    middleware: function (connect, opt) {
      var middlewares = []
      middlewares.push(connect.favicon())
      return middlewares
    }
  })
  done()
})

gulp.task('selenium-start', function (done) {
  selenium.install({ logger: console.log }, function () {
    selenium.start(function () {
      done()
    })
  })
})

gulp.task('e2e-start', ['e2e-serve', 'selenium-start'])
gulp.task('e2e-sauce-start', ['e2e-serve', 'test.sauce.start'])

gulp.task('watch:e2e', ['e2e-serve', 'selenium-start'], function (done) {
  gulp.watch(['e2e_test/**'], function () {
    runSequence('test:e2e')
  })
})

gulp.task('default', taskListing)
