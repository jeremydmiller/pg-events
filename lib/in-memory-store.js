function SimpleStore(type){
	this.type = type;
}

SimpleStore.prototype.find = function(id){
	return this[id];
};

SimpleStore.prototype.update = function(id, data){
	this[id] = data;
};

SimpleStore.prototype.requireStorage = function(graph){
	if (this.type == '$aggregates') return;

	graph.requireStorageFor(this.type);
};

function InMemoryStore(){
	var self = this;
	self.data = {};

	self.byId = function(type){
		if (!self.data[type]){
			self.data[type] = new SimpleStore(type);
		}

		return self.data[type];
	};

	self.byType = function(){
		return self.byId('$aggregates');
	}

	self.findAggregate = function(name){
		return self.byType().find(name);
	}

	self.storeAggregate = function(name, data){
		self.byType().update(name, data);
	}

	self.find = function(type, id){
		return self.byId(type).find(id);
	}

	return self;
}

module.exports = InMemoryStore;
