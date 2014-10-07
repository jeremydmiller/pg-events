var DdlBuilder = require('./ddl-builder');

function ProjectionDdl(builder){
	var self = this;

	var addQueue = function(projection){
		builder.add('rolling-buffer-template', {name: projection.name, size: projection.queue_size || 200});
	}


	self.asyncByStream = function(projection){
		addQueue(projection.name);
	}

	self.syncByStream = function(projection){

	}

	self.asyncByEvent = function(projection){
		addQueue(projection.name);
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