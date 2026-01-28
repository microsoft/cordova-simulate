// ============================================================================
// Gulpfile for cordova-simulate
//
// What this file does:
// - Provides Gulp tasks used by CI and local workflows.
// - Keeps the existing "gulp default" entrypoint.
//
// Purpose / effect:
// - "gulp default" runs the "lint" task.
// - "lint" runs JSON validation only (no JavaScript ESLint here).
// - JavaScript linting is executed via the npm script entrypoint (npm run lint)
//   outside of Gulp (e.g., from CI YAML or developers running npm scripts).
// ============================================================================
var gulp = require('gulp');
var jsonlint = require('gulp-jsonlint');

// ============================================================================
// Task: jsonlint
//
// What it does:
// - Validates JSON files and fails if invalid JSON is found.
//
// Purpose / effect:
// - Ensures package.json and JSON assets under src/ are syntactically valid.
// - Produces CI failures when JSON is invalid.
// ============================================================================
gulp.task('jsonlint', function () {
    return gulp
        .src(['src/**/*.json', 'package.json'])
        .pipe(jsonlint())
        .pipe(jsonlint.reporter())
        .pipe(jsonlint.failAfterError());
});

// ============================================================================
// Task: lint
//
// What it does:
// - Runs jsonlint only.
//
// Purpose / effect:
// - Keeps the task name "lint" for compatibility with existing pipelines.
// - Ensures "gulp default" still performs a lint gate (JSON validation).
// ============================================================================
gulp.task('lint', gulp.series('jsonlint'));

// ============================================================================
// Task: default
//
// What it does:
// - Runs the "lint" task when "gulp" is executed without task name.
//
// Purpose / effect:
// - Preserves the existing pipeline behavior that calls "gulp" / "gulp default".
// ============================================================================
gulp.task('default', gulp.series('lint'));
