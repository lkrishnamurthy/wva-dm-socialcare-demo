var express = require('express');
var poweredBy = require('connect-powered-by');

// The following 3 modules are required for authentication
var session = require('express-session');

var flash = require('connect-flash');
var passport = require('passport');

module.exports = function() {
  // Use middleware.  Standard [Connect](http://www.senchalabs.org/connect/)
  // middleware is built-in, with additional [third-party](https://github.com/senchalabs/connect/wiki)
  // middleware available as separate modules.
  if ('development' == this.env) {
    this.use(express.logger());
  }

  this.use(poweredBy('Locomotive'));
  this.use(express.favicon('public/favicon.ico'));
  this.use(express.static(__dirname + '/../../bower_components'));
  this.use(express.static(__dirname + '/../../node_modules'));
  this.use(express.static(__dirname + '/../../public'));

  // The cookieparser is also required for authentication
  this.use(express.cookieParser());

  this.use(express.bodyParser());

  this.use(express.methodOverride());

// Passport does not directly manage your session, it only uses the session.
// So you configure session attributes (e.g. life of your session) via express
  this.use(express.session({ secret: 'wow2016dmdemosecret', cookie: { maxAge: 3600000 } }));

  this.use(flash());

  this.use(passport.initialize());
  this.use(passport.session());

  this.use(this.router);
  this.use(express.errorHandler());

}
