var StreamAggregator = require('./stream-aggregator');

function AggregateProjector(name, definition, store){
	this.aggregator = new StreamAggregator(name, definition, store);
	this.name = name;
	this.definition = definition;
	this.store = store;
}

AggregateProjector.prototype.register = function(projector){
	for (key in this.definition){
		if (key.lastIndexOf('$') == -1){
			projector.byEvent.add(key, this);
		}
	}
}

AggregateProjector.prototype.processEvent = function(id, evt){
	var state = this.aggregator.processEvent(this.name, evt);
	return state;
}

module.exports = AggregateProjector;