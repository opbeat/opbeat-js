var gulp = require('gulp')
var browserify = require('browserify')
var source = require('vinyl-source-stream')
var serve = require('gulp-serve')
var concat = require('gulp-concat')

// Static file server
gulp.task('server', serve({
  root: ['example', 'dist'],
  port: 7000
}))

gulp.task('build', function () {
  return browserify('./src/opbeat.js', {
    standalone: 'Opbeat'
  }).bundle()
    .pipe(source('opbeat.js'))
    .pipe(gulp.dest('./dist'))
})

// Development mode
gulp.task('watch', [], function (cb) {
  gulp.run(
    'build',
    'server'
  )

  // Watch JS files
  gulp.watch(['libs/**', 'src/**'], ['build'])

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
