var ProjectionPlan = require('./projection-plan');

function ProjectionLibrary(){
	this.aggregates = {};
	this.eventToStream = {};
	this.projections = {};
	this.inlinePlans = {};
	this.delayedPlans = {};
	this.events = {};
}

ProjectionLibrary.prototype.addStream = function(aggregate){
	if (aggregate.name == null) throw new Error('Aggregate is missing a name');

	this.aggregates[aggregate.name] = aggregate;

	for (var i = 0; i < aggregate.events.length; i++){
		var event = aggregate.events[i];
		this.eventToStream[event] = aggregate.name;
		this.events[event] = 0;
	}
}	

ProjectionLibrary.prototype.acceptVisitor = function(visitor){
	for (var key in this.projections){
		this.projections[key].acceptVisitor(visitor);
	}
}

ProjectionLibrary.prototype.streamTypeForEvent = function(eventType){
	return this.eventToStream[eventType];
}

ProjectionLibrary.prototype.compile = function(){
	var events = this.allEvents();
	for (var i = 0; i < events.length; i++){
		var e = events[i];
		this.inlinePlans[e] = new ProjectionPlan(e);
		this.delayedPlans[e] = new ProjectionPlan(e);
	}

	// goofy, but it works
	this.acceptVisitor(this);

	for (key in this.inlinePlans){
		this.inlinePlans[key].seal();
	}

	for (key in this.delayedPlans){
		this.delayedPlans[key].seal();
	}
}

ProjectionLibrary.prototype.add = function(projection){
	this.projections[projection.name] = projection;
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

ProjectionLibrary.prototype.inlinePlanFor = function(eventType){
	return this.inlinePlans[eventType] || new ProjectionPlan(eventType);
}

ProjectionLibrary.prototype.delayedPlanFor = function(eventType){
	return this.delayedPlans[eventType] || new ProjectionPlan(eventType);
}

ProjectionLibrary.prototype.allEvents = function(){
	var events = [];
	for (key in this.events){
		events.push(key);
	}

	return events;
}

ProjectionLibrary.prototype.addToPlan = function(projection){
	for (var i = 0; i < projection.events.length; i++){
		var e = projection.events[i];

		if (projection.mode == 'sync'){
			this.inlinePlans[e].add(projection);
		}

		if (projection.mode == 'async'){
			this.delayedPlans[e].add(projection);
			this.inlinePlans[e].shouldQueue = true;
		}

		if (projection.mode == 'external'){
			this.inlinePlans[e].shouldQueue = true;
		}
	}
}


ProjectionLibrary.prototype.byStream = function(projection){
	this.addToPlan(projection);
}

ProjectionLibrary.prototype.byEvent = function(projection){
	this.addToPlan(projection);
}

ProjectionLibrary.prototype.aggregate = function(projection){
	for (var i = 0; i < projection.events.length; i++){
		var e = projection.events[i];
		this.delayedPlans[e].add(projection);
		this.inlinePlans[e].shouldQueue = true;
	}
}

ProjectionLibrary.prototype.grouped = function(projection){
	throw new Error('Not implemented!');
}




module.exports = ProjectionLibrary;

