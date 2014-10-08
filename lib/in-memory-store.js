var _ = require('lodash');
var StoreBase = require('./store-base');

function SimpleStore(type){
	this.type = type;
}

SimpleStore.prototype.find = function(id){
	return this[id];
};

SimpleStore.prototype.update = function(id, data){
	this[id] = data;
};


function InMemoryStore(){
	var self = new StoreBase(SimpleStore);
	self.data = {};
	self.aggregates = {};

	self.findAggregate = function(name){
		var key = 'aggregate:' + name;
		return self.data[key];
	}

	self.storeAggregate = function(name, data){
		var key = 'aggregate:' + name;
		return self.data[key] = data;
	}

	self.updateProjection = function(name, id, evt){
		var projection = require('./projections').projections[name];
		var state = this.findView(name, id);
		var newState = projection.applyEvent(state, evt);
		this.updateView(name, id, newState);
	}

	self.id = 0;

	self.newId = function(){
		self.id = self.id + 1;

		return self.id;
	}

	self.insertStream = function(id, version, type){
		if (version == null){
			throw new Error('version is null');
		}

		self.data[id] = {id: id, version: version, type: type, events:[]};
	}

	self.updateStream = function(id, version){
		self.data[id].version = version;
	}

	self.findStream = function(id){
		return self.data[id];
	}

	self.appendEvent = function(id, version, data, eventType, eventId){
		data.$id = eventId;
		data.$type = eventType;
		self.findStream(id).events.push(data);
	}

	self.reset = function(){
		self.data = {};
		this.aggregates = {};
	}

	


	self.findCurrentSnapshot = function(id){
		return self.aggregates[id];
	}

	self.persistSnapshot = function(id, data, version){
		self.aggregates[id] = {data: data, version: version};
	}

	self.findEventsAfter = function(id, version){
		return _.filter(self.findStream(id).events, function(x){
			return x.$version > version;
		}).map(function(e){
			return {data: e, version: e.$version}
		});
	}

	self.saveEvents = function(id, events){
		if (self.data[id] == null){
			self.data[id] = {id: id, events: []};
		}

		var storage = self.data[id];
		if (storage == null){
			storage = [];
		}

		for (var i = 0; i < events.length; i++){
			var evt = events[i];
			evt.$version = storage.events.length + 1;
			storage.events.push(evt);
		}
	}



	self.findEventsUpTo = function(id, version){
		return _.filter(self.data[id].events, function(x){
			return x.$version <= version;
		});
	}

	return self;
}

module.exports = InMemoryStore;
