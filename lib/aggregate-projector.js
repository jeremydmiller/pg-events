var StreamAggregator = require('./stream-aggregator');

function AggregateProjector(name, definition){
	this.aggregator = new StreamAggregator(definition);
	this.name = name;
	this.definition = definition;
	this.mode = 'async';

	this.events = [];
	for (key in definition){
		if (typeof definition[key] == 'function' && key.charAt(0) != '$'){
			this.events.push(key);
		}
	}
}

AggregateProjector.prototype.acceptVisitor = function(visitor){
	visitor.aggregate(this);
}

// Errors are caught and processed in the async projection running
AggregateProjector.prototype.processEvent = function(store, stream, evt){
	var current = store.findAggregate(this.name);
	newState = this.aggregator.applyEvent(current, evt);
	store.storeAggregate(this.name, newState);
}

module.exports = AggregateProjector;