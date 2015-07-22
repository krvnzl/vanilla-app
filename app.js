'use strict';

/*
 * Express Dependencies
 */
var express = require('express');
var app = express();
var port = 8080;
var fs = require('fs');
var compression = require('compression')

/*
 * Use Handlebars for templating
 */
// var exphbs = require('express3-handlebars');
// var hbs;

// For gzip compression
app.use(compression());

/*
 * Config for Production and Development
 */
if (process.env.NODE_ENV === 'production') {
    // Set the default layout and locate layouts and partials
    // app.engine('handlebars', exphbs({
    //     defaultLayout: 'main',
    //     layoutsDir: 'dist/views/layouts/',
    //     partialsDir: 'dist/views/partials/'
    // }));

    // // Locate the views
    // app.set('views', __dirname + '/dist/views');

    // Locate the assets
    app.use(express.static(__dirname + '/dist/assets'));

} else {
    // app.engine('handlebars', exphbs({
    //     // Default Layout and locate layouts and partials
    //     defaultLayout: 'main',
    //     layoutsDir: 'views/layouts/',
    //     partialsDir: 'views/partials/'
    // }));

    // // Locate the views
    // app.set('views', __dirname + '/views');

    // Locate the assets
    app.use(express.static(__dirname + '/assets'));
    app.use('/bower_components',  express.static(__dirname + '/bower_components'));
}

// Set Handlebars
// app.set('view engine', 'handlebars');



/*
 * Routes
 */
// Index Page
app.get('/', function(req, res) {
    fs.readFile(__dirname + '/index.html', 'utf8', function(err, text){
        res.send(text);
    });
});


app.set('port', process.env.PORT || 8080);
/*
 * Start it up
 */

 app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'))
  })
