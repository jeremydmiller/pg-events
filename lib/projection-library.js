function ProjectionLibrary(){
	this.aggregates = {};
	this.eventToStream = {};
	this.projections = {};
}

ProjectionLibrary.prototype.aggregate = function(aggregate){
	this.aggregates[aggregate.name] = aggregate;

	for (var i = 0; i < aggregate.events.length; i++){
		this.eventToStream[aggregate.events[i]] = aggregate.name;
	}
}	

ProjectionLibrary.prototype.streamTypeForEvent = function(eventType){
	return this.eventToStream[eventType];
}

ProjectionLibrary.prototype.compile = function(){

}

ProjectionLibrary.prototype.add = function(projection){
	this.projections[projection.name] = this;
}

ProjectionLibrary.prototype.get = function(name){
	return this.projections[name];
}

ProjectionLibrary.prototype.activeProjectionNames = function(){
	var names = [];
	for (key in this.projections){
		names.push(key);
	}

	return names;
}

ProjectionLibrary.prototype.executorFor = function(eventType){
	throw new Error('Not Implemented!');
}

ProjectionLibrary.prototype.delayedExecutorFor = function(eventType){
	throw new Error('Not Implemented!');
}

function ProjectionPlan(event){
	this.event = event;
	this.projections = [];
	this.shouldQueue = false;
}

var queueingProjection = {
	processEvent: function(storage, stream, evt){
		storage.queueProjectionEvent(evt.$id, stream.id);
	},

	name: 'QueueProjectionEvent'
}

ProjectionPlan.prototype.seal = function(){
	if (this.shouldQueue){
		this.projections.push(queueingProjection);
	}
}

ProjectionPlan.prototype.add = function(projection){
	this.projections.push(projection);
}

ProjectionPlan.prototype.execute = function(storage, stream, evt){
	for (var i = 0; i < this.projections.length; i++){
		this.projections[i].processEvent(storage, evt, stream, evt);
	}
}

module.exports = ProjectionLibrary;

