var DdlBuilder = require('./ddl-builder');

function ProjectionDdl(builder){
	var self = this;


	var upsertView = function(projection){
		builder.add('upsert_stream_view', {name: projection.name, dbname: projection.name.toLowerCase()});
	}


	self.byStream = function(projection){
		upsertView(projection);
	}

	self.byEvent = function(projection){

	}

	self.aggregate = function(projection){

	}

	self.grouped = function(projection){
		throw new Error('Not yet implemented');
	}

	self.text = function(){
		return builder.text();
	}

	return this;
}


module.exports = ProjectionDdl;