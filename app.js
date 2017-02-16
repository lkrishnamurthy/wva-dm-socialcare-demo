var locomotive = require('locomotive');
var bootable = require('bootable');

// Bring in the module providing the wrapper for cf env
var cfenv = require('./utils/cfenv-wrapper');

// Create a new application and initialize it with *required* support for
// controllers and views.  Move (or remove) these lines at your own peril.
var app = new locomotive.Application();
app.phase(locomotive.boot.controllers(__dirname + '/app/controllers'));
app.phase(locomotive.boot.views());

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();
global.appEnv = appEnv;
printEnvironment(global.appEnv);

// Add phases to configure environments, run initializers, draw routes, and
// start an HTTP server.  Additional phases can be inserted as needed, which
// is particularly useful if your application handles upgrades from HTTP to
// other protocols such as WebSocket.
app.phase(require('bootable-environment')(__dirname + '/config/environments'));
app.phase(bootable.initializers(__dirname + '/config/initializers'));
app.phase(locomotive.boot.routes(__dirname + '/config/routes'));
app.phase(locomotive.boot.httpServer(appEnv.port, '0.0.0.0'));

// Boot the application.  The phases registered above will be executed
// sequentially, resulting in a fully initialized server that is listening
// for requests.
app.boot(function(err) {
  if (err) {
    console.error(err.message);
    console.error(err.stack);
    return process.exit(-1);
  }
});

function printEnvironment(appEnv) {
	// Basic info provided by cfenv
	console.log('BASE_INFO');
	console.log('---------');
	console.log('Is Local: ' + appEnv.isLocal + '');
	console.log('App Name: ' + appEnv.name + '');
	console.log('Port: ' + appEnv.port  + '');
	console.log('Bind: ' + appEnv.bind  + '');
	console.log('URL: ' + appEnv.url  + '');

	// Service info provided by cfenv
	console.log('');
	console.log('SERVICES');
	console.log('--------');
	var services = appEnv.getServices();
	var count = 0;
	for (var serviceName in services) {
		if (services.hasOwnProperty(serviceName)) {
			count++;
			var service = services[serviceName];
			console.log(service.name + '');
		}
	}
	if (!count) {
		console.log('No services are bound to this app.');
	}

	// Get environment variables using my new functions for environment var access
	console.log('');
	console.log('ENVIRONMENT VARIABLES');
	console.log('----------------------------');
	var envVars = appEnv.getEnvVars();
	count = 0;
	for (var key in envVars) {
		if (!envVars.hasOwnProperty || envVars.hasOwnProperty(key)) {
			if (key !== 'VCAP_SERVICES' && key !== 'VCAP_APPLICATION') {
				count++;
				var envVar = appEnv.getEnvVar(key); // Could just do envVars[key], but want to exercise getEnvVar
				console.log(key + ':' + envVar + '');
			}
		}
	}
	if (!count) {
		console.log('No environment variables for this app.');
	}
}
