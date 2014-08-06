#! /usr/bin/env node

function listAllUsages(){
	console.log('Print the entire usage here');
}

var configFile = process.cwd() + '/pg-events.json';

if (process.argv.length == 2){
	listAllUsages();
	return;

}



var commands = {
	seed: function(args){
		console.log('seed');
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
		console.log('rebuild');
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


