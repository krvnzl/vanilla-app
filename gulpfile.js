'use strict'

var gulp = require('gulp')
var browserify = require('browserify')
var source = require('vinyl-source-stream')
var buffer = require('vinyl-buffer')
var merge = require('merge-stream')
var chalk = require('chalk')
var shell = require('shelljs')

var s3 = require('s3')

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
        entries: ['./assets/index.js'],
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
    ],

    dest: './public/angular/'
  },

  less: [{
    src: './src/less/marketing/main.less',
    watch: './src/less/marketing/*.less',
    dest: './public/stylesheets/css/'
  }],

  fonts: {
    src: './assets/fonts/**',
    dest: './public/stylesheets/fonts'
  },

  jade: {
    marketing: {
      src: [ './assets/templates/*.jade' ],
      dest: './public/views/'
    }
  }

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
  // iterate through bundles and build each one
  return merge.apply(merge, config.js.bundles.map(function (c) {
    c.watch = watch
    c.minify = minify
    c.dest = config.js.dest
    return buildJs(c)
  }))
}

/*
 * Compile LESS css
 */
function compileLess (minify, less) {
  console.log('build LESS...')

  less = less || config.less

  return merge.apply(merge, less.map(function (l) {
    return gulp.src(l.src)
      .pipe($.plumber())
      .pipe($.sourcemaps.init())
      .pipe($.less())
      .pipe($.if(minify, $.minifyCss()))
      .pipe($.sourcemaps.write('./'))
      .pipe(gulp.dest(l.dest))
  }))
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
  gulp.src(config.jade.src)
    .pipe(jade())
    .pipe(templateCache({
      module: "views.templates",
      //assumes you're declaring elsewhere 
      standalone: true,
      // 
      root: "views/"
    }))
    .pipe(rename("templates.js"))
    .pipe(gulp.dest(config.js.dest))
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
    compileLess(true),
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
  javascript(true, false)
  buildJade(true)

  config.less.forEach(function (l) {
    gulp.watch(l.watch, function () {
      compileLess(false, [l])
        .pipe(browserSync.stream({match: '**/*.css'}))
    })
  })

  gulp.watch([
    config.jade.admin.src,
    config.jade.marketing.src
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

gulp.task('less', function () {
  return compileLess()
})
gulp.task('fonts', copyFonts)

gulp.task('jade', function () {
  return buildJade(false)
})

gulp.task('nodemon', nodemon)
gulp.task('serve', ['nodemon'], serve)
gulp.task('watch', ['nodemon', 'serve', 'js:libs', 'fonts'], watch)
gulp.task('default', ['watch'])