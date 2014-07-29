// put $version in the snapshot

var StreamAggregator = require('./stream-aggregator');

function SnapshotAggregator(name, definition){
	this.name = name;
	this.aggregator = new StreamAggregator(name, definition, null);


	this.events = [];
	for (key in definition){
		if (typeof definition[key] == 'function' && key.charAt(0) != '$'){
			this.events.push(key);
		}
	}
	
	this.maxAge = definition.maxAge || 5;
}

SnapshotAggregator.prototype.latest = function(store, id){
	var snapshot = store.findCurrentSnapshot(id) || {version: 0, data: null};

	var newEvents = store.findEventsAfter(id, snapshot.version);
	var data = snapshot.data;
	for (var i = 0; i < newEvents.length; i++){
		var evt = newEvents[i];
		data = this.aggregator.applyEvent(data, evt.data);
		data.$version = evt.version;
	}


	return data;
}

SnapshotAggregator.prototype.rebuild = function(store, id, latest){
	if (latest == null){
		latest = this.latest(store, id);
	}

	store.persistSnapshot(id, latest, latest.$version);
}

SnapshotAggregator.prototype.atVersion = function(store, id, version){
	var events = store.findEventsUpTo(id, version);

	var data = this.aggregator.createSnapshot(events);
	data.$version = version;

	return data;
}

module.exports = SnapshotAggregator;
