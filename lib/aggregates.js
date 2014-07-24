var SnapshotAggregator = require('./snapshot-aggregator');

module.exports = {
	types: {},
	eventTypes: {},
	names: [],

	aggregate: function(name, definition){
		var aggregator = new SnapshotAggregator(name, definition);

		this.names.push(name);
		this.types[name] = aggregator;
	
		for (var i = 0; i < aggregator.events.length; i++){
			this.eventTypes[aggregator.events[i]] = name;
		}
	},

	requiresSnapshotUpdate: function(type, current, lastSnapshot){
		var aggregator = this.types[type];
		if (aggregator == null){
			throw 'Unknown stream type ' + type;
		}

		return (current - lastSnapshot) >= aggregator.maxAge;
	},

	streamTypeForEvent: function(eventType){
		return this.eventTypes[eventType];
	},

	clearAll: function(){
		this.types = {};
		this.eventTypes = {};
		this.names = [];
	},

	rebuild: function(persistor, id){

	}


}