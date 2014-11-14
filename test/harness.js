var config = require('../pg-events.json');
var connection = config.database;
var projectionFolder = __dirname + '/projections';
var Promise = require("bluebird");
var expect = require('chai').expect;

var client = require('../lib/index');
client.start({connection: connection, projection_folder: projectionFolder});



function Harness(){
	this.steps = [];

	var self = this;

	this.add = function(generator){
		this.steps.push(generator());
	}

	this.append = function(){
		var message = client.toEventMessage(arguments);
		self.lastId = message.id;

		this.add(function*(){
			yield client.append(message);
		});
	}

	this.stream = function(){
		var id = self.lastId;
		var assertion = null;
		if (arguments.length == 2){
			id = arguments[0];
			assertion = arguments[1];
		}
		else{
			assertion = arguments[0];
		}

		this.add(function*(){
			var s = yield client.fetchStream(id);
			assertion(s);
		});
	}

	this.view = function(id, view, func){
		this.add(function*(){
			var state = yield client.findView(id, view);
			func(state);
		});
	}

	this.viewShouldBe = function(id, view, expected){
		this.view(id, view, function(v){
			expect(v).to.deep.equal(expected);
		});
	}

	this.snapshotShouldBe = function(id, expected){
		this.add(function*(){
			var snapshot = yield client.fetchCurrentSnapshot(id);
			expect(snapshot).to.deep.equal(expected);
		});
	}

	this.snapshotShouldBeNull = function(id){
		this.add(function*(){
			var snapshot = yield client.fetchCurrentSnapshot(id);
			expect(snapshot).to.be.null;
		});
	}

	this.latestAggregateShouldBe = function(id, expected){
		this.add(function*(){
			var x = yield client.fetchLatestAggregate(id);
			expect(x).to.deep.equal(expected);
		});
	}

	this.dbSingleRowShouldBe = function(sql, args, expected){
		this.add(function*(){
			var results = yield client.query(sql, args);
			expect(results.rows.length).to.equal(1);
			expect(results.rows[0]).to.deep.equal(expected);
		});
	}

	this.queueDepthShouldBe = function(expected){
		this.add(function*(){
			var count = yield client.rollingBuffer().queuedCount();
			expect(count).to.equal(expected);
		});
	}

	this.queueContentsShouldBe = function(expected){
		this.add(function*(){
			var results = yield client.rollingBuffer().queuedEvents();

			expect(results).to.deep.equal(expected);
		});
	}

	this.aggregateShouldBe = function(name, expected){
		this.add(function*(){
			var results = yield client.findView(name);

			expect(results).to.deep.equal(expected);
		});
	}

	this.shouldBeNoRecordedErrorsFromAsyncProjectionProcessing = function(){
		this.add(function*(){
			var results = yield client.query('select * from pge_projection_errors', []);
			if (results.rows.length > 0){
				throw new Error('Async projection errors detected! --> ' + JSON.stringify(results.rows));
			}
		});
	}


	this.executeAllQueuedProjectionEvents = function(func){
		this.add(function*(){
			var errors = yield client.asyncDaemon().processAll();
			if (func){
				func(errors);
			}
		});
	}

	this.startAsyncDaemon = function(){
		this.add(function*(){
			client.daemon = client.asyncDaemon();
			client.daemon.startWatching();
		});
	}

	this.waitForNonStaleResults = function(){
		this.add(function*(){
			yield client.waitForNonStaleResults(10000);
		});
	}


	this.execute = function(client){
		var steps = this.steps;


		return Promise.coroutine(function*(){
			for (var i = 0; i < steps.length; i++){
				yield* steps[i];
			}
		})().finally(function(){
			if (client.daemon){
				return client.daemon.stopWatching();
			}
		});
	}
}

var seeded = false;
var projections = null;

module.exports = {
	seed: function(){
		if (seeded){
			return Promise.resolve(projections);
		}

		return client.config.seedAll({connection: connection, projection_folder: projectionFolder})
			.then(function(result){
				seeded = true;
				projections = result; 
				
				return result;
			});

	},

	cleanAll: function(done){
		if (!seeded){
			return this.seed().then(function(){
				return client.config.cleanAll();
			});
		}

		return client.config.cleanAll();
	},

	asyncDaemon: function(){
		return client.asyncDaemon();
	},

	scenario: function(configure){
		var harness = new Harness();
		configure(harness);

		return harness.execute(client);
	}
};

