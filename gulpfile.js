'use strict'

var gulp = require('gulp')
var browserify = require('browserify')
var concat = require('gulp-concat')
var source = require('vinyl-source-stream')
var buffer = require('vinyl-buffer')
var merge = require('merge-stream')
var chalk = require('chalk')
var shell = require('shelljs')
var sass = require('gulp-sass')

var $ = require('gulp-load-plugins')()

var browserSync

// load environment variables from .env
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  require('dotenv').load()
}

//config object defines paths to directories as variables to be used in defining
// gulp tasks

var config = {
  js: {
    bundles: [
      {
        entries: ['./assets/modules/app/vanillaApp.js'],
        outputName: 'compiled.js'
      }
    ],
    libs: [
      './node_modules/jquery/dist/jquery.js',
      './node_modules/angular/angular.js',
      './node_modules/angular-animate/angular-animate.js',
      './node_modules/angular-aria/angular-aria.js',
      './node_modules/angular-resource/angular-resource.js',
      './node_modules/angular-touch/angular-touch.js',
      './node_modules/angular-sanitize/angular-sanitize.js',
      './node_modules/angular-ui-router/build/angular-ui-router.js'
    ],
    src: './assets/modules/**/*.js',
    dest: './public/javascript/'
  },

  sass: {
    src: './assets/modules/**/*.scss',
    compiled: './public/stylesheets/',
    watch: './assets/modules/**/*.scss',
    dest: './public/stylesheets/'
  },

  fonts: {
    src: './assets/fonts/**',
    dest: './public/font/'
  },

  jade: {
    src: [ './assets/modules/**/*.jade' ],
    dest: './public/views/'
  },
  home: {
    src: "assets/modules/app/index.jade",
    dest: "./"
  },

}

/*
 * build JS
 */

// help function
function buildJs (config) {
  var bundler = browserify({
    // Required watchify args
    cache: {},
    packageCache: {},
    fullPaths: config.watch, // only need fullPaths if we're watching

    // Specify the entry point of your app
    entries: config.entries,

    // Enable source maps!
    debug: true
  })

  bundler.transform(require('browserify-plain-jade'))

  function bundle () {
    console.log('bundling...')
    var jsStream = bundler
      .bundle()
      .on('error', function (error) {
        console.error('Error building javascript!')
        console.error(error.message)
        this.emit('end')
      })
      .pipe(source(config.outputName))
      .pipe(buffer())
      .pipe($.plumber())
      .pipe($.sourcemaps.init({loadMaps: true}))
      .pipe($.if(config.minify, $.uglify()))
      .pipe($.sourcemaps.write('./'))
      .pipe(gulp.dest(config.dest))
      .on('finish', function () {
        if (browserSync) {
          browserSync.reload(config.dest + config.outputName)
        }
        console.log('done')
      })

    return jsStream
  }

  if (config.watch) {
    console.log('Starting watchify...')
    var watchify = require('watchify')
    bundler = watchify(bundler)
    bundler.on('update', bundle)
  }

  return bundle()
}

function javascript (watch, minify) {
  console.log("we are compiling the JS");
  // iterate through bundles and build each one
  return merge.apply(merge, config.js.bundles.map(function (c) {
    c.watch = watch
    c.minify = minify
    c.dest = config.js.dest
    return buildJs(c)
  }))
}

function copyJsLibs (minify) {
  return gulp.src(config.js.libs)
    .pipe($.changed(config.js.dest))
    .pipe($.sourcemaps.init({loadMaps: true}))
      .pipe($.if(minify, $.uglify()))
      .pipe($.concat('libs.js'))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest(config.js.dest))
}

/*
 * Compile SASS css
 */

function compileSass () {
  console.log('build SASS...')
  var compile = gulp.src(config.sass.src)
    .pipe(sass().on('error', sass.logError))
    .pipe(sass({outputStyle: 'compressed'}))
    //.pipe(gulp.dest(config.sass.compiled))
    .pipe(concat('vanilla.css'))
    .pipe(gulp.dest(config.sass.dest));

  return compile
}

function copyFonts () {
  return gulp.src(config.fonts.src)
    .pipe($.changed(config.fonts.dest))
    .pipe(gulp.dest(config.fonts.dest))
}

/*
 * Build Jade
 */
function buildJade(watch) {
  console.log("build Jade...");
  buildHome()
  var compile = 
    gulp.src(config.jade.src)
    .pipe($.plumber())
    .pipe($.jade())
    .pipe($.angularTemplatecache({
      module: 'app.templates',
      standalone: true,
      root: 'views/'
    }))
    .pipe($.rename('templates.js'))
    .pipe(gulp.dest(config.js.dest))
    return compile
}

/*
 * Build Home
 */
 function buildHome() {
  console.log("building Home...");
  gulp.src(config.home.src)
    .pipe($.jade())
    .pipe($.rename("index.html"))
    .pipe(gulp.dest(config.home.dest));
}

function nodemon (cb) {
  var called = false

  return $.nodemon(config.serverConfig)
    .on('start', function onStart () {
      // ensure start only got called once
      if (!called) { cb() }
      called = true
    })
    .on('restart', function onRestart () {
      console.log('restarting node server...'.green)
    })
}

function buildProduction () {
  return merge.apply(undefined, [
    copyJsLibs(true),
    copyFonts(),
    javascript(false, true),
    buildJade(true)
  ])

}

function serve (done) {
  browserSync = require('browser-sync').create()
  browserSync.init({
    // server: {
    //   baseDir: './public'
    // },
    proxy: 'http://localhost:8080',
    port: 8081,
    reloadDelay: 1000,

    open: !!$.util.env.open,
    offline: true,
    notify: false
  }, done)
}

function watch () {
  // Enable watchify
  console.log('moving on to jade');
  buildJade(true)

  gulp.watch(config.js.src, function() {
    console.log('now we js');
     javascript(true, false)
  })

  gulp.watch(config.sass.src, function() {
    compileSass()
    .pipe(browserSync.stream())
  });

  gulp.watch([
    config.jade.src,
  ], function () {
    buildJade()
      .pipe(browserSync.stream({match: '**/*.js'}))
  })
}

/*
 * define tasks
 */
gulp.task('js', function () {
  return javascript(false, false)
})

gulp.task('sass', function () {
  return compileSass()
})
gulp.task('fonts', copyFonts)

gulp.task('jade', function () {
  return buildJade(false)
})

gulp.task('js:libs', function () {
  return copyJsLibs(true)
})

gulp.task('nodemon', nodemon)
gulp.task('serve', ['nodemon'], serve)
gulp.task('watch', ['nodemon', 'serve', 'js:libs', 'fonts', 'sass'], watch)
gulp.task('default', ['watch'])