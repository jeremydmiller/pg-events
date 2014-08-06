#! /usr/bin/env node --harmony

function listAllUsages(){
	console.log('The command line tool for pg-events');
	console.log('See the website at https://github.com/jeremydmiller/pg-events for more information');
	console.log('Commands:');
	console.log('    config -- saves the database connection and projections folder name to the file pg-events.json');
	console.log('      list -- lists the configuration in the file pg-events.json, but can be overriden by flags');
	console.log('      seed -- seed the postgresql database schema with all the pg-events tables, including projection tables');
	console.log('   rebuild -- rebuilds all the persisted projections in the schema');
	console.log();
	console.log('Flags:');
	console.log('    --database or -d => the database connection as required by the pg library');
	console.log(' --projections or -p => the folder holding the projection definition scripts');
	console.log('');
}

var configFile = process.cwd() + '/pg-events.json';

if (process.argv.length == 2){
	listAllUsages();
	return;

}



var commands = {
	seed: function(options){
		var client = require('./index');
		var clientOpts = {connection: options.database, projection_folder: options.projections};

		client.start(clientOpts);
		client.config.seedAll(clientOpts)
			.then(function(result){
				console.log('Created tables:');
				
				result.tables.forEach(function(t){
					console.log(' * ' + t);
				});
				console.log('');

				console.log('Loaded modules:');
				result.modules.forEach(function(m){
					console.log(' * ' + m);
				});
				console.log('');

				console.log('Activated projections:');
				result.projections.forEach(function(p){
					console.log(' * ' + p);
				});
				console.log('');
			});
	},

	config: function(options){
		var contents = JSON.stringify(options, null, 4);

		fs.writeFile(configFile, contents, function (err) {
		  if (err) throw err;
		  console.log('Successfully wrote configuration data');
		  console.log(contents);
		  console.log('-- to file ' + configFile);
		});
	},

	list: function(options){
		var contents = JSON.stringify(options, null, 4);
		console.log('The configured options in file ' + configFile + ' are:');
		console.log(contents);
	},

	rebuild: function(args){
		console.log('At some point this will be a valid command to reload and rebuild projections');
	}

};

var fs = require('fs');

var readOptions = function(data){
	var options = {};

	if (data){
		options = JSON.parse(data);
	}

	var parseArgs = require('minimist');
	var args = parseArgs(process.argv.slice(3));
	if (args['d']){
		options.database = args['d'];
	}

	if (args['database']){
		options.database = args['database'];
	}

	if (args['p']){
		options.projections = args['p'];
	}

	if (args['projections']){
		options.projections = args['projections'];
	}

	if (options.projections){
		options.projections = require('path').resolve(options.projections);
	}
	

	return options;
}

var commandName = process.argv[2];
var command = commands[commandName];
if (command){
	
	fs.readFile(configFile, function(err, data){
		var options = readOptions(data);
		if (options.database == null || options.projections == null){
			console.log('Insufficient information:');
			console.log('database = ' + options.database);
			console.log('projections = ' + options.projections);
			console.log('');
			listAllUsages();
		}
		else{
			command(options);
		}
	});
}
else {
	listAllUsages();
}


