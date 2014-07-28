var fs = require('fs');
var Path = require('path');

function StringBuilder(text){
	this.text = text || '';

	this.appendLine = function(text){
		if (arguments.length == 0){
			this.text = this.text + '\n';
			return;
		}

		this.text = this.text + text + '\n';
	};

	return this;
}

module.exports = function(projector, projectionFiles){
	var self = this;

	var dropDDL = "DROP TABLE IF EXISTS pge_projections_* CASCADE;";
	var createDDL = [
		"CREATE TABLE pge_projections_* (",
		"	id			uuid CONSTRAINT pk_pge_projections_* PRIMARY KEY,",
		"	data		json NOT NULL",
		");",

	];

	var drop = function(name, builder){
		builder.appendLine(dropDDL.replace("*", name));
	};

	var create = function(name, builder){
		createDDL.forEach(function(ddl){
			builder.appendLine(ddl.replace("*", name));
		});

		return createDDL.map(function(ddl){
			return ddl.replace("*", name);
		});
	};

	this.generate = function(){
		var builder = new StringBuilder();
		builder.appendLine();

		projector.views.forEach(function(name){
			drop(name, builder);
			create(name, builder);
			builder.appendLine();
			builder.appendLine();
		});

		return builder.text;
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


