var StreamAggregator = require('./stream-aggregator');

function AggregateProjector(name, definition){
	this.aggregator = new StreamAggregator(name, definition);
	this.name = name;
	this.definition = definition;
	this.async = true;
}

AggregateProjector.prototype.acceptVisitor = function(visitor){
	visitor.aggregate(this);
}

AggregateProjector.prototype.register = function(projector){
	for (key in this.definition){
		if (key.lastIndexOf('$') == -1){
			projector.byEvent.add(key, this);
		}
	}
}

AggregateProjector.prototype.processEvent = function(store, id, evt){
	var state = store.findAggregate(this.name);
	state = this.aggregator.applyEvent(state, evt);

	store.storeAggregate(this.name, state);

	return state;
}

module.exports = AggregateProjector;