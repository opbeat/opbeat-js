var gulp = require('gulp')
var source = require('vinyl-source-stream')
var serve = require('gulp-serve')
var rename = require('gulp-rename')
var browserify = require('browserify')
var buffer = require('vinyl-buffer')
var uglify = require('gulp-uglify')
var taskListing = require('gulp-task-listing')

// Static file server
gulp.task('server', serve({
  root: ['examples', 'dist'],
  port: 7000
}))

gulp.task('release', function () {
  return browserify('./src/opbeat.js', {
    standalone: 'Opbeat'
  }).bundle()
    .pipe(source('opbeat.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(rename('opbeat.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('./dist'))
})

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

gulp.task('default', taskListing)
