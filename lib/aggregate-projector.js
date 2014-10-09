var StreamAggregator = require('./stream-aggregator');

function AggregateProjector(name, definition){
	this.aggregator = new StreamAggregator(name, definition);
	this.name = name;
	this.definition = definition;
	this.async = true;

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

AggregateProjector.prototype.register = function(projector){
	for (key in this.definition){
		if (key.lastIndexOf('$') == -1){
			projector.byEvent.add(key, this);
		}
	}
}

AggregateProjector.prototype.processEvent = function(store, stream, evt){
	// TODO -- do something.
}

module.exports = AggregateProjector;