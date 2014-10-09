// TODO -- generalize this!

var pg = require('pg');
var Promise = require("bluebird");
var Path = require('path');
var DdlBuilder = require('./ddl-builder');

Object.keys(pg).forEach(function(key) {
	if (key == "native") return;

    var Class = pg[key];
    if (typeof Class === "function") {
        Promise.promisifyAll(Class.prototype);
        Promise.promisifyAll(Class);
    }
})
Promise.promisifyAll(pg);

fs = require('fs');

var seedSchema = function(conn){
	var file = __dirname + '/sql/schema.sql';
	var schema = fs.readFileSync(file, 'utf8');

	conn.then(function(c){
		console.log(schema);
		c.client.query(schema);
	});
}



var loadModule = function(path){
	var path = __dirname + path;
	var text = fs.readFileSync(path, 'utf8');
	var name = Path.basename(path, '.js');


	return function(promise, client, log){
		return promise.then(function(){
			log.modules.push(name);
			return client.queryAsync('insert into pge_modules (name, definition) values ($1, $2)', [name, text]);
		});
	}
}

var loadFile = function(filename){
	var file = __dirname + '/sql/' + filename;
	var schema = fs.readFileSync(file, 'utf8');

	return function(promise, client, log){
		return promise.then(function(){
			return client.queryAsync(schema)
		});
	};
}


var loadSchema = function(promise, client, log){
	var file = __dirname + '/sql/schema.sql';
	var schema = fs.readFileSync(file, 'utf8');

	return promise.then(function(){
		return client.queryAsync(schema)
	});
}

var logTables = function(promise, client, log){
	return promise.then(function(){
		return client.queryAsync("select table_name from information_schema.tables where table_name like 'pge_%' order by table_name");
	})
	.then(function(results){
		log.tables = [];
		for (var i = 0; i < results.rows.length; i++){
			log.tables.push(results.rows[i].table_name);
		}
	});
}


var execute = function(connection, operations){
	var log = {tables: [], modules: []};


	return pg.connectAsync(connection)
		.then(function(args){
			var client = args[0];
			var release = args[1];

			var promise = Promise.resolve(null);
			
			for (var i = 0; i < operations.length; i++){
				promise = operations[i](promise, client, log);
			}

			return promise.finally(release);
		})
		.then(function(){
			return log;
		});
}

var createBuffer = function(promise, client, log){
	var builder = new DdlBuilder();
	builder.add('rolling-buffer-template', {size: 200});

	return promise.then(function(){
		return client.queryAsync(builder.text());
	});
}

var initialize = function(promise, client, log){
	return promise.then(function(){
		return client.queryAsync('select pge_initialize()').timeout(100, 'Timed out while trying to initialize the event storage and projections');
	});
}

// TODO -- need to log functions too
exports.seedAll = function(options){
	console.log('Seeding the projection and event storage tables to the database');

	var projectionLoader = buildProjectionLoader(options);

	var operations = [
		loadFile('schema.sql'), 
		loadFile('initializer.sql'), 
		loadFile('functions.sql'), 
		loadFile('pge_append_event.sql'),
		createBuffer,
		logTables,
		loadModule('/server/eventstore.js'),
		loadModule('/server/postgres-store.js'),
		loadModule('/projections.js'),
		loadModule('/stream-aggregator.js'),
		loadModule('/event-projector.js'),
		loadModule('/aggregate-projector.js'),
		loadModule('/snapshot-aggregator.js'),
		loadModule('/store-base.js'),
		projectionLoader.seedAllTables,
		projectionLoader.loadAllProjections,
		initialize
	];

	return execute(options.connection, operations);
};

var buildProjectionLoader = function(options){
	var projector = require('./projections');
	var Loader = require('./projection-loader');

	var files = projector.loadProjectionsFromFolder(options.projection_folder);

 	return new Loader(projector, files);
};

// look for file: as an option
exports.generateDDL = function(options){
 	return buildProjectionLoader(options).generate();
};













