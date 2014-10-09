var StreamAggregator = require('./stream-aggregator');
var AggregateProjector = require('./aggregate-projector');
var EventProjector = require('./event-projector');
var SnapshotAggregator = require('./snapshot-aggregator');

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


function ProjectionSet(){
	this.data = {};

	this.add = function(key, value){
		if (!this.data[key]){
			this.data[key] = [];
		}

		this.data[key].push(value);
	}

	this.get = function(key){
		if (!this.data[key]){
			return [];
		}

		return this.data[key];
	}

	this.clear = function(){
		this.data = {};
	}

	return this;
}




function Projector(){
	var self = this;

	self.byStream = new ProjectionSet();
	self.byEvent = new ProjectionSet();

	self.projections = {};

	self.types = {};
	self.eventTypes = {};
	self.names = [];
	self.views = [];

	self.reset = function(){
		self.byStream.clear();
		self.byEvent.clear();
		for (key in self.projections){
			delete self.projections[key];
		}

		self.types = {};
		self.eventTypes = {};
		self.names = [];
		self.views = [];
	};

	self.buildLatestAggregate = function(storage, id){
		var latest = storage.findCurrentSnapshot(id);

		if (latest == null) throw 'Unable to determine the latest snapshot for id: ' + id;

		var aggregator = self.types[latest.type];
		if (aggregator == null) throw 'Unknown stream type ' + latest.type;

		return aggregator.latest(storage, id, latest);
	}

	self.aggregate = function(definition){
		var aggregator = new SnapshotAggregator(definition.stream, definition);

		this.names.push(definition.stream);
		this.types[definition.stream] = aggregator;
	
		for (var i = 0; i < aggregator.events.length; i++){
			this.eventTypes[aggregator.events[i]] = definition.stream;
		}
	}

	self.requiresSnapshotUpdate = function(type, current, lastSnapshot){
		var aggregator = this.types[type];
		if (aggregator == null){
			throw 'Unknown stream type ' + type;
		}

		return (current - lastSnapshot) >= parseInt(aggregator.maxAge);
	}

	self.streamTypeForEvent = function(eventType){
		return this.eventTypes[eventType];
	}

	// TODO -- maybe make this a little more efficient by
	// reusing the data?
	self.rebuildSnapshot = function(storage, stream){
		var aggregator = this.types[stream.type];
		if (aggregator == null){
			throw 'Unknown stream type ' + type;
		}

		aggregator.rebuild(storage, stream.id);
	}

	// TODO -- validate input
	self.projectStream = function(definition){
		self.views.push(definition.name);

		var aggregator = new StreamAggregator(definition);
		self.byStream.add(definition.stream, aggregator);
		self.projections[definition.name] = aggregator;

		return aggregator;
	};

	// TODO -- validate input
	self.projectAcrossStreams = function(definition){
		var aggregator = new AggregateProjector(definition.name, definition);
		
		aggregator.register(self);

		self.projections[definition.name] = aggregator;

		return aggregator;
	};


	// TODO -- validate the input
	self.projectEvent = function(config){
		self.views.push(config.name);

		var eventProjector = new EventProjector(config);

		self.byEvent.add(config.event, eventProjector);
		self.projections[config.name] = eventProjector;
		
		return eventProjector;
	};

	// TODO -- there is going to be some difference later between
	// capturing and processing when we introduce async projections
	self.captureEvent = function(store, id, streamType, evt){
		self.processEvent(store, id, streamType, evt);
	};


	self.processEvent = function(store, id, streamType, evt){
		var projections = self.byStream.get(streamType).concat(self.byEvent.get(evt.$type));
		for (var i = 0; i < projections.length; i++){
			projections[i].processEvent(store, id, evt);
		}	
	};



	self.activeProjectionNames = function(){
		var names = [];
		for (key in self.projections){
			names.push(key);
		}

		return names;
	};

	var forEachFile = function(folder, callback){
		var files = require('fs').readdirSync(folder);
		for (var i = 0; i < files.length; i++){
			var path = folder + '/' + files[i];

			callback(path);
		}
	}

	// Purposely forgoing lodash or underscore for the minute
	self.loadProjectionsFromFolder = function(folder){
		self.reset();

		var names = require('fs').readdirSync(folder);

		var files = [];

		for (var i = 0; i < names.length; i++){
			if (!endsWith(names[i], '.js')) continue;

			var file = folder + "/" + names[i];
			// My sanity in mocha tests is going to be a lot better if we 
			// can force this to reload the projection
			// file.
			if (require.cache){
				delete require.cache[file];
			}

			try {
				require(file);
			}
			catch (ex){
				throw 'Error while loading projections from ' + file + ': ' + ex;
			}
			

			files.push(file);
		}


		return files;
	};

	


	return self;
}



module.exports = new Projector();
