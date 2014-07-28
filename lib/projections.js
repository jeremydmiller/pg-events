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

	self.aggregate = function(name, definition){
		var aggregator = new SnapshotAggregator(name, definition);

		this.names.push(name);
		this.types[name] = aggregator;
	
		for (var i = 0; i < aggregator.events.length; i++){
			this.eventTypes[aggregator.events[i]] = name;
		}
	}

	self.requiresSnapshotUpdate = function(type, current, lastSnapshot){
		var aggregator = this.types[type];
		if (aggregator == null){
			throw 'Unknown stream type ' + type;
		}

		return (current - lastSnapshot) >= aggregator.maxAge;
	}

	self.streamTypeForEvent = function(eventType){
		return this.eventTypes[eventType];
	}

	self.projectStream = function(stream){
		return {
			named: function(name){
				self.views.push(name);

				return {
					by: function(definition){
						var aggregator = new StreamAggregator(name, definition, self.store.byId(name));
						self.byStream.add(stream, aggregator);
						self.projections[name] = aggregator;

						return aggregator;
					}
				}
			}
		};
	};

	self.projectAcrossStreams = function(name){
		return {
			by: function(definition){
				var aggregator = new AggregateProjector(name, definition, self.store.byType());
				
				aggregator.register(self);

				self.projections[name] = aggregator;

				return aggregator;
			}
		}
	};



	self.projectEvent = function(event){
		return {
			named: function(name){
				self.views.push(name);

				return {
					by: function(transform){
						var eventProjector = new EventProjector(name, transform, self.store.byId(name));
						self.byEvent.add(event, eventProjector);
						self.projections[name] = eventProjector;
						return eventProjector;
					}
				}
			}
		};
	};

	// TODO -- there is going to be some difference later between
	// capturing and processing when we introduce async projections
	self.captureEvent = function(id, streamType, evt){
		self.processEvent(id, streamType, evt);
	};


	self.processEvent = function(id, streamType, evt){
		var projections = self.byStream.get(streamType).concat(self.byEvent.get(evt.$type));
		for (var i = 0; i < projections.length; i++){
			projections[i].processEvent(id, evt);
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
