var connection = 'postgres://jeremill:@localhost/projections';
var projectionFolder = __dirname + '/projections';
var Promise = require("bluebird");
var expect = require('chai').expect;

var client = require('../lib/index');
client.start({connection: connection, projection_folder: projectionFolder});

function Harness(){
	this.steps = [];

	this.append = function(){
		var message = client.toEventMessage(arguments);

		this.steps.push(function(promise){
			return promise.then(function(){
				return client.append(message);
			});
		});
	}

	this.stream = function(){
		if (arguments.length == 2){
			var id = arguments[0];
			var assertion = arguments[1];

			this.steps.push(function(promise){
				return promise.then(function(){
					return client.fetchStream(id)
						.then(assertion);
				});
			});
		}

		if (arguments.length == 1){
			var assertion = arguments[0];

			this.steps.push(function(promise){
				return promise.then(function(result){
					return client.fetchStream(result.id)
						.then(assertion);
				});
			});
		}


	}

	this.view = function(id, view, func){
		this.steps.push(function(promise){
			return promise.then(function(){
				return client.fetchView(id, view)
					.then(func);
			});
		});
	}

	this.viewShouldBe = function(id, view, expected){
		this.view(id, view, function(v){
			expect(v).to.deep.equal(expected);
		});
	}

	this.snapshotShouldBe = function(id, expected){
		this.steps.push(function(promise){
			return promise.then(function(){
				return client.fetchCurrentSnapshot(id)
					.then(function(snapshot){
						expect(snapshot).to.deep.equal(expected);
					});
			});
		});
	}

	this.snapshotShouldBeNull = function(id){
		this.steps.push(function(promise){
			return promise.then(function(){
				return client.fetchCurrentSnapshot(id)
					.then(function(s){
						expect(s).to.be.null;
					});
			});
		});
	}

	this.latestAggregateShouldBe = function(id, expected){
		this.steps.push(function(promise){
			return promise.then(function(){
				return client.fetchLatestAggregate(id)
					.then(function(x){
						expect(x).to.deep.equal(expected);
					});
			});
		});
	}

	this.execute = function(client){
		var promise = Promise.resolve(null);

		this.steps.forEach(function(step){
			promise = step(promise);
		});

		return promise;
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

	scenario: function(configure){
		var harness = new Harness();
		configure(harness);

		return harness.execute(client);
	}
};

