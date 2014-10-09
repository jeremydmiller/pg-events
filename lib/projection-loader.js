var fs = require('fs');
var Path = require('path');

var StringBuilder = require('./string-builder');
var DdlBuilder = require('./ddl-builder');
var ProjectionDdl = require('./projection-ddl');

module.exports = function(projector, projectionFiles){
	var self = this;

	var builder = new DdlBuilder();
	var ddl = new ProjectionDdl(builder);

	this.generate = function(){
		projector.library.acceptVisitor(ddl);

		return builder.text();
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


