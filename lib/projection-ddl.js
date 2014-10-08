var DdlBuilder = require('./ddl-builder');

function ProjectionDdl(builder){
	var self = this;

	var addQueue = function(projection){
		builder.add('rolling-buffer-template', {name: projection.name, size: projection.queue_size || 200});
	}

	var upsertView = function(projection){
		builder.add('upsert_stream_view', {name: projection.name, dbname: projection.name.toLowerCase()});
	}


	self.asyncByStream = function(projection){
		addQueue(projection);
		upsertView(projection);
	}

	self.syncByStream = function(projection){
		upsertView(projection);
	}

	self.asyncByEvent = function(projection){
		addQueue(projection);
	}

	self.syncByEvent = function(projection){

	}

	self.aggregate = function(projection){
		addQueue(projection);
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