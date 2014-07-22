var gulp = require('gulp');
var mocha = require('gulp-mocha');

gulp.task('default', function() {
  console.log('Hello!');
});

gulp.task('mocha', function(){
    return gulp.src(['test/test-*.js'], { read: false })
        .pipe(mocha({
            reporter: 'spec',
            globals: {}
        }));
});