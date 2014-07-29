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

	this.execute = function(client){
		var promise = Promise.resolve(null);

		this.steps.forEach(function(step){
			promise = step(promise);
		});

		return promise;
	}
}



module.exports = {
	seeded: false,

	seed: function(){
		if (this.seeded){
			return Promise.resolve(this.projections);
		}

		return client.config.seedAll({connection: connection, projection_folder: projectionFolder})
			.then(function(result){
				this.seeded = true;
				this.projections = result; 
				
				return result;
			});

	},

	cleanAll: function(done){
		return client.config.cleanAll();
	},

	scenario: function(configure){
		var harness = new Harness();
		configure(harness);

		return harness.execute(client);
	}
};

