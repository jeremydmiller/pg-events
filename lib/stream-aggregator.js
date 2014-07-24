function StreamAggregator(name, definition, store){
	this.name = name;
	this.definition = definition;

	this.store = store;

	if (this.definition.$init == null){
		this.definition.$init = function(){
			return {};
		}
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

StreamAggregator.prototype.processEvent = function(id, evt){
	var state = this.store.find(id);

	state = this.applyEvent(state, evt);

	this.store.update(id, state);

	return state;
}

module.exports = StreamAggregator;