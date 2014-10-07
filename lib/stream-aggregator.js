function StreamAggregator(name, definition){
	this.name = name;
	this.definition = definition;
	this.async = true;

	if (this.definition.$init == null){
		this.definition.$init = function(){
			return {};
		}
	}


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

StreamAggregator.prototype.processEvent = function(store, id, evt){
	var state = store.findView(this.name, id);

	state = this.applyEvent(state, evt);

	store.updateView(this.name, id, state);

	return state;
}

module.exports = StreamAggregator;