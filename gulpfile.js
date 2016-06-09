var gulp        = require('gulp'),
    eslint      = require('gulp-eslint'),
    jsonlint    = require('gulp-jsonlint');

gulp.task('eslint', function () {
    return gulp.src('src/**/*.js')
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('jsonlint', function () {
    return gulp.src([ 'src/**/*.json', 'package.json' ])
        .pipe(jsonlint())
        .pipe(jsonlint.reporter())
        .pipe(jsonlint.failAfterError());
});

gulp.task('lint', [ 'eslint', 'jsonlint' ]);

gulp.task('default', [ 'lint' ]);
