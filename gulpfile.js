var gulp = require('gulp')
var livereload = require('gulp-livereload')
var serve = require('gulp-serve')
var concat = require('gulp-concat')
var uglify = require('gulp-uglify')

// Static file server
gulp.task('server', serve({
  root: ['example', 'dist'],
  port: 7000
}))

// Task for refreshing everything (HTML, etc)
gulp.task('refresh-browser', function () {
  gulp.src('package.json', {
    read: false
  }).pipe(livereload())
})

// Files to bundle
JS_DIST_FILES = [
  'node_modules/tracekit/tracekit.js',
  'src/opbeat.js'
]

// Bundles files into
gulp.task('process-scripts', function () {
  gulp.src(JS_DIST_FILES)
    .pipe(concat('opbeat.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(uglify().on('error', function (e) { console.log('\x07', e.message); return this.end(); }))
    .pipe(concat('opbeat.min.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(livereload())
})

// Development mode
gulp.task('watch', [], function (cb) {
  // Livereload
  livereload.listen()

  gulp.run(
    'process-scripts',
    'server'
  )

  // Watch JS files
  gulp.watch(['libs/**', 'src/**'], ['process-scripts'])

  // Watch example files
  gulp.watch('example/**', ['refresh-browser'])

  console.log('\nExample site running on http://localhost:7000/\n')
})

//
// Default task
//
gulp.task('default', function () {
  var response = ['',
    'No task selected.',
    'Available tasks:', '',
    'gulp watch       - Watch files and preview example site on localhost.', ''
  ].join('\n')

  console.log(response)
})
