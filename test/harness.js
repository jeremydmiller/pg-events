var connection = 'postgres://jeremill:@localhost/projections';
var projectionFolder = __dirname + '/projections';
var Promise = require("bluebird");
var expect = require('chai').expect;

var client = require('../lib/index');
client.start({connection: connection, projection_folder: projectionFolder});



function Harness(){
	this.steps = [];

	var self = this;

	this.append = function(){
		var message = client.toEventMessage(arguments);
		self.lastId = message.id;

		this.steps.push(function*(){
			yield client.append(message);
		});
	}

	this.stream = function(){
		var id = self.id;
		var assertion = null;
		if (arguments.length == 2){
			id = arguments[0];
			assertion = arguments[1];
		}
		else{
			assertion = arguments[0];
		}

		this.steps.push(function*(){
			var s = yield client.fetchStream(id);
			assertion(s);
		});
	}

	this.view = function(id, view, func){
		this.steps.push(function*(){
			var view = yield client.fetchView(id, view);
			func(view);
		});
	}

	this.viewShouldBe = function(id, view, expected){
		this.view(id, view, function(v){
			expect(v).to.deep.equal(expected);
		});
	}

	this.snapshotShouldBe = function(id, expected){
		this.steps.push(function*(){
			var snapshot = yield client.fetchCurrentSnapshot(id);
			expect(snapshot).to.deep.equal(expected);
		});
	}

	this.snapshotShouldBeNull = function(id){
		this.steps.push(function*(){
			var snapshot = yield client.fetchCurrentSnapshot(id);
			expect(snapshot).to.be.null;
		});
	}

	this.latestAggregateShouldBe = function(id, expected){
		this.steps.push(function*(){
			var x = yield client.fetchLatestAggregate(id);
			expect(x).to.deep.equal(expected);
		});
	}

	this.execute = function(client){
		return Promise.coroutine(function*(){
			this.steps.forEach(function(s){
				yield* s;
			});
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

	scenario: function(configure){
		var harness = new Harness();
		configure(harness);

		return harness.execute(client);
	}
};

