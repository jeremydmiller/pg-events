// TODO -- generalize this!

var pg = require('pg');
var Promise = require("bluebird");
var Path = require('path');
var DdlBuilder = require('./ddl-builder');
var Database = require('postgres-gen');
var _ = require('lodash');
var StringBuilder = require('./string-builder');
var ProjectionDdl = require('./projection-ddl');
var projector = require('./projections');
var fs = require('fs');



var sqlFiles = [
	'schema', 
	'initializer', 
	'functions', 
	'pge_append_event', 
	'async_projection_handling'
];

var internalFiles = [
	'/server/eventstore.js', 
	'/server/postgres-store.js', 
	'/projection-plan.js', 
	'/projection-library.js', 
	'/projections.js',
	'/stream-aggregator.js',
	'/event-projector.js',
	'/aggregate-projector.js',
	'/snapshot-aggregator.js',
	'/store-base.js'
];

var loadProjections = function*(options, db){
	var projector = require('./projections');
	var files = projector.loadProjectionsFromFolder(options.projection_folder);

	yield db.query('delete from pge_projection_definitions');

	for (var i = 0; i < files.length; i++){
		var file = files[i];

		console.log("Loading projection file " + file);

		var text = fs.readFileSync(file, 'utf8');
		var name = Path.basename(file, '.js');

		yield db.query('insert into pge_projection_definitions (name, definition) values (?, ?)', [name, text]);
	}
}

var generateDDL = function(options){
	var builder = new DdlBuilder();
	var ddl = new ProjectionDdl(builder);

	projector.library.acceptVisitor(ddl);

	return builder.text();
}


exports.seedAll = function(options){
	var db = new Database(options.connection);

	var log = {modules: []};

	var loadFiles = function*(files){
		for (var i = 0; i < files.length; i++){
			var file = __dirname + '/sql/' + files[i] + '.sql';
			var schema = fs.readFileSync(file, 'utf8');

			yield db.query(schema);
		}
	}

	var runDDL = function*(key, args){
		var builder = new DdlBuilder();
		builder.add(key, args);

		yield db.query(builder.text());
	}


	var loadInternalModules = function*(files){
		for (var i = 0; i < files.length; i++){
			var file = __dirname + files[i];
			var name = Path.basename(files[i], '.js');

			yield* loadModule(file, name);
		}
	}

	var loadModule = function*(file, name){
		var text = fs.readFileSync(file, 'utf8');

		log.modules.push(name);
		yield db.query('insert into pge_modules (name, definition) values (?, ?)', [name, text]);
	}

	var collectData = function*(){
		var tables = yield db.query("select table_name from information_schema.tables where table_name like 'pge_%' order by table_name");
		log.tables = _.map(tables.rows, function(x){return x.table_name;});

		var names = yield db.query('select name from pge_projection_definitions order by name');
		log.projections = names.rows.map(function(x){
			return x.name;
		});
	}



	var execute = Promise.coroutine(function*(){
		yield* loadFiles(sqlFiles);

		yield* runDDL('rolling-buffer-template', {size: 200});

		yield* loadInternalModules(internalFiles);

		yield* loadProjections(options, db);

		yield* collectData();

		var projectionSql = generateDDL(options);

		yield db.query(projectionSql);

		yield db.query('select pge_initialize()');
		
		return log;
	});

	return execute();
}

exports.generateDDL = generateDDL;


exports.rebuildProjections = function(options){
	var loader = Promise.coroutine(function*(){

		var db = new Database(options.connection);

		return db.transaction(function*(t){
			yield* loadProjections(options, t);

			yield t.query('select pge_initialize()');

			console.log('Replaying events...');
			yield t.query('select pge_rebuild_naive()');

			var rows = yield t.query('select name from pge_projection_definitions order by name');
		
			return _.map(rows, function(x){
				return x.name;
			});
		});
	});

	return loader();
};











