var StreamAggregator = require('./stream-aggregator');
var AggregateProjector = require('./aggregate-projector');
var EventProjector = require('./event-projector');
var SnapshotAggregator = require('./snapshot-aggregator');
var ProjectionLibrary = require('./projection-library');

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
	self.library = new ProjectionLibrary();

	self.reset = function(){
		self.library = new ProjectionLibrary();
	};

	self.buildLatestAggregate = function(storage, id){
		var latest = storage.findCurrentSnapshot(id);

		if (latest == null) throw 'Unable to determine the latest snapshot for id: ' + id;

		var aggregator = self.library.aggregates[latest.type];
		if (aggregator == null) throw 'Unknown stream type ' + latest.type;

		return aggregator.latest(storage, id, latest);
	}

	self.aggregate = function(definition){
		var aggregator = new SnapshotAggregator(definition.stream, definition);

		self.library.addStream(aggregator);
	}

	self.requiresSnapshotUpdate = function(type, current, lastSnapshot){
		var aggregator = this.library.aggregates[type];
		if (aggregator == null){
			throw 'Unknown stream type ' + type;
		}

		return (current - lastSnapshot) >= parseInt(aggregator.maxAge);
	}

	self.streamTypeForEvent = function(eventType){
		return self.library.streamTypeForEvent(eventType);
	}

	self.rebuildSnapshot = function(storage, stream){
		var aggregator = this.library.aggregates[stream.type];
		if (aggregator == null){
			throw 'Unknown stream type ' + type;
		}

		aggregator.rebuild(storage, stream.id);
	}

	self.projectStream = function(definition){
		if (definition.name == null){
			throw new Error("'name' is required");
		}

		if (definition.stream == null){
			throw new Error("'stream' is required for per stream projections");
		}

		var aggregator = new StreamAggregator(definition);
		self.library.add(aggregator);

		return aggregator;
	};

	self.projectAcrossStreams = function(definition){
		if (definition.name == null){
			throw new Error("'name' is required");
		}

		var aggregator = new AggregateProjector(definition.name, definition);
		self.library.add(aggregator);

		return aggregator;
	};



	self.projectEvent = function(config){
		if (config.name == null){
			throw new Error("'name' is required");
		}

		if (config.transform == null){
			throw new Error("'transform' is required");
		}

		if (config.event == null){
			throw new Error("'event' is required");
		}

		var eventProjector = new EventProjector(config);

		self.library.add(eventProjector);

		return eventProjector;
	};

	self.captureEvent = function(store, stream, evt){
		self.processEvent(store, stream, evt);
	};


	self.processEvent = function(store, stream, evt){
		var plan = self.library.inlinePlanFor(evt.$type);

		plan.execute(store, stream, evt);
	};

	self.activeProjectionNames = function(){
		return self.library.activeProjectionNames();
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

		self.library.compile();


		return files;
	};

	self.findProjection = function(name){
		return self.library.get(name);
	}

	return self;
}



module.exports = new Projector();
