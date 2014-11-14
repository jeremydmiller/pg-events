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

ProjectionPlan.prototype.execute = function(storage, stream, evt, onerror){
	for (var i = 0; i < this.projections.length; i++){
		try {
			this.projections[i].processEvent(storage, stream, evt);
		}
		catch (e){
			if (onerror){
				onerror({event: evt.$id, projection: this.projections[i].name, error: e.toString()});
			}
			else {
				throw new Error('Failed on projection ' + this.projections[i].name + ' with error ' + e);
			}
		}
		
	}

}

module.exports = ProjectionPlan;