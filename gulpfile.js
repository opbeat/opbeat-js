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

var sourceTargets = [
  './src/opbeat.js',
  './src/angular-opbeat.js'
]

// Static file server
gulp.task('server', function () {
  connect.server({
    root: ['examples', 'dist'],
    port: 7000,
    livereload: false,
    open: false,
  })
})

gulp.task('build:release', function () {
  var version = require('./package').version
  var majorVersion = version.match(/^(\d).(\d).(\d)/)[1]

  var path = './dist/' + majorVersion

  var tasks = sourceTargets.map(function (entry) {
    return browserify({
      entries: [entry],
      standalone: ''
    })
      .bundle()
      .pipe(source(entry))
      .pipe(rename({ dirname: '' }))
      .pipe(buffer())
      .pipe(injectVersion({
        replace: new RegExp(RegExp.escape('%%VERSION%%'), 'g')
      }))
      .pipe(derequire())
      .pipe(gulp.dest(path))
      .pipe(rename({
        extname: '.min.js'
      }))
      .pipe(uglify())
      .pipe(gulp.dest(path))
  })

  return es.merge.apply(null, tasks)

})

gulp.task('build', function () {
  var tasks = sourceTargets.map(function (entry) {
    return browserify({
      entries: [entry],
      standalone: ''
    })
      .bundle()
      .pipe(source(entry))
      .pipe(rename({ dirname: '' }))
      .pipe(buffer())
      .pipe(injectVersion({
        replace: new RegExp(RegExp.escape('%%VERSION%%'), 'g')
      }))
      .pipe(derequire())
      .pipe(gulp.dest('./dist/'))
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
  gulp.watch(['libs/**', 'src/**'], function () { runSequence('build', 'karma-run')})
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

  return gulp.src('dist/**')
    // Gzip
    .pipe(awspublish.gzip())
    // Publish files with headers
    .pipe(publisher.publish(headers))
    // Create a cache file to speed up consecutive uploads
    .pipe(publisher.cache())
    // Print upload updates to console
    .pipe(awspublish.reporter())
})

function runKarma (configFile, done) {
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
  var stream = gulp.src('wdio.conf.js').pipe(webdriver())
  stream.on('error', function () {})
  done()
})

gulp.task('e2e-serve', function (done) {
  connect.server({
    root: ['e2e_test', 'dist'],
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

gulp.task('watch:e2e', ['e2e-serve'], function (done) {
  selenium.install({logger: console.log}, () => {
    selenium.start(function () {
      gulp.watch(['e2e_test/**'], function () {
        runSequence('test:e2e')
      })
    })
  })
})

gulp.task('default', taskListing)
