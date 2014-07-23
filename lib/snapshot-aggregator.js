// put $version in the snapshot

var StreamAggregator = require('./stream-aggregator');

function SnapshotAggregator(name, store, definition){
	this.name = name;
	this.aggregator = new StreamAggregator(name, definition, store);
	this.store = store;
}

SnapshotAggregator.prototype.latest = function(id){
	var latestSnapshot = this.store.findLatest(id);
	var version = 0;
	var data = null;

	if (latestSnapshot != null){
		version = latestSnapshot.version;
		data = latestSnapshot.data;
	}

	var newEvents = this.store.findEventsAfter(id, version);

	for (var i = 0; i < newEvents.length; i++){
		var evt = newEvents[i];
		data = this.aggregator.applyEvent(data, evt.data);
		data.$version = evt.version;
	}


	return data;
}

SnapshotAggregator.prototype.rebuild = function(id){
	var latest = this.latest(id);
	this.store.persist(id, latest, latest.$version);

}

SnapshotAggregator.prototype.atVersion = function(id, version){
	var events = this.store.findEventsUpTo(id, version);

	var data = this.aggregator.createSnapshot(events);
	data.$version = version;

	return data;
}

module.exports = SnapshotAggregator;
