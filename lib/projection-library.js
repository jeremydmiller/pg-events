function ProjectionLibrary(){
	this.aggregates = {};
	this.eventToStream = {};
	this.projections = {};
	this.inlinePlans = {};
	this.delayedPlans = {};
	this.events = {};
}

ProjectionLibrary.prototype.aggregate = function(aggregate){
	this.aggregates[aggregate.name] = aggregate;

	for (var i = 0; i < aggregate.events.length; i++){
		var event = aggregate.events[i];
		this.eventToStream[event] = aggregate.name;
		this.events[event] = 0;
	}
}	

ProjectionLibrary.prototype.streamTypeForEvent = function(eventType){
	return this.eventToStream[eventType];
}

ProjectionLibrary.prototype.compile = function(){

}

ProjectionLibrary.prototype.add = function(projection){
	this.projections[projection.name] = this;
	for (var i = 0; i < projection.events.length; i++){
		var event = projection.events[i];
		this.events[event] = 0;
	}
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

ProjectionLibrary.prototype.allEvents = function(){
	var events = [];
	for (key in this.events){
		events.push(key);
	}

	return events;
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

