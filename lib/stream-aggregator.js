function StreamAggregator(name, definition){
	this.name = name;
	this.definition = definition;
	this.async = true;

	if (this.definition.$init == null){
		this.definition.$init = function(){
			return {};
		}
	}

	this.queue_size = definition.queue_size || 200;
}

StreamAggregator.prototype.acceptVisitor = function(visitor){
	if (this.async){
		visitor.asyncByStream(this);
	}
	else {
		visitor.syncByStream(this);
	}
}

StreamAggregator.prototype.applyEvent = function(state, data){
	var eventType = data.$type;
	var transform = this.definition[eventType];

	if (eventType == null){
		throw 'Missing $type in data ' + JSON.stringify(data);
	}

	if (state == null){
		state = this.definition.$init();
	}

	if (transform){
		transform(state, data);
	}

	return state;
}

StreamAggregator.prototype.createSnapshot = function(events){
	var state = this.definition.$init();

	for (var i = 0; i < events.length; i++){
		this.applyEvent(state, events[i]);
	}

	return state;
}

// Optimize away the if/then
StreamAggregator.prototype.processEvent = function(store, id, evt){
	if (this.async){
		store.queueProjectionEvent(this.name, id, evt.$id);
	}
	else {
		store.updateProjection(this.name, id, evt);
	}
}

module.exports = StreamAggregator;