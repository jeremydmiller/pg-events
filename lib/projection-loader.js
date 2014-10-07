var fs = require('fs');
var Path = require('path');

var StringBuilder = require('./string-builder');
var DdlBuilder = require('./ddl-builder');

module.exports = function(projector, projectionFiles){
	var self = this;

	var ddl = new DdlBuilder();

	this.generate = function(){
		projector.views.forEach(function(name){
			ddl.add('projection-table', {name: name});
		});

		return ddl.text();
	};

	self.seedAllTables = function(promise, client, log){
		return promise.then(function(){
			return client.queryAsync(self.generate());
		});
	};

	self.loadAllProjections = function(promise, client, log){
		promise = promise.then(function(){
			return client.queryAsync('delete from pge_projection_definitions');
		});

		projectionFiles.forEach(function(file){
			var text = fs.readFileSync(file, 'utf8');
			var name = Path.basename(file, '.js');

			promise = promise.then(function(){
				return client.queryAsync('insert into pge_projection_definitions (name, definition) values ($1, $2)', [name, text]);
			});
		});



		return promise.then(function(){
			return client.queryAsync('select name from pge_projection_definitions order by name');
		})
		.then(function(result){
			log.projections = result.rows.map(function(x){
				return x.name;
			})
		});
	};

	return self;

}


