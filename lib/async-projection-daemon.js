var pg = require('pg');
var Promise = require("bluebird");
var uuid = require('node-uuid');

var Database = require('postgres-gen');
var PostgresService = require('./pg-service');
var RollingBuffer = require('./rolling-buffer');


Object.keys(pg).forEach(function(key) {
	if (key == "native") return;

    var Class = pg[key];
    if (typeof Class === "function") {
        Promise.promisifyAll(Class.prototype);
        Promise.promisifyAll(Class);
    }
})
Promise.promisifyAll(pg);





function defer() {
    var resolve, reject;
    var promise = new Promise(function() {
        resolve = arguments[0];
        reject = arguments[1];
    });
    return {
        resolve: resolve,
        reject: reject,
        promise: promise
    };
}

function promiseWhile(condition, action) {
    var resolver = defer();

    var loop = function() {
        if (!condition()) return resolver.resolve();
        return Promise.resolve(action())
            .then(loop)
            .catch(resolver.reject);
    };

    process.nextTick(loop);

    return resolver;
};

function AsyncRunner(worker){
	lastProcessed = 0;
	current = 0;
	latched = false;

	this.running = false;

	var self = this;

	var shouldContinue = function(){
		return !latched;
	}

	var shouldFetchAgain = function(result){
		if (latched) return false;

		if (result.highest == 0) return false;

		return result.highest > result.processed;
	}

	// TODO -- make the "cooldown" time configurable
	var runProjections = function(){
		return Promise.coroutine(function*(){
			if (latched) return;

			var result = yield worker.processQueuedProjectionWork();
			while (shouldFetchAgain(result)){
				result = yield worker.processQueuedProjectionWork();
			}
		})().then(function(){
			if (latched) return;

			return Promise.delay(1000);
		});
	}

	this.markQueued = function(messageId){
		if (messageId > current){
			current = messageId;
		}	
	}

	this.start = function(){
		latched = false;

		this.resolver = promiseWhile(shouldContinue, runProjections);
	}

	this.stop = function(){
		latched = true;

		return this.resolver.promise;
	}
}

module.exports = function(db){
	var processor = new PostgresService({
		processAll: function(){
			var rollingBuffer = new RollingBuffer(this.db);
			var self = this;

			// TODO -- add some console logging
			return Promise.coroutine(function*(){
				var count = yield rollingBuffer.queuedCount();
				while (count > 0){
					var returnValue = yield self.processQueuedProjectionWork();
					count = yield rollingBuffer.queuedCount();
				}
			})();
		},

		// TODO -- harden this
		startWatching: function(){
			console.log("Starting to watch for async notifications");

			var self = this;

			this.runner = new AsyncRunner(this);
			this.runner.start();

			this.watching = true;

			//var client = new pg.Client(this.db.connectionString());
			/*
			client.connect();
			client.query('LISTEN "pge_event_queued"');
			client.on('notification', function(data) {
				// Not trying for perfect here
				var messageId = parseInt(data.payload);

				self.runner.markQueued(messageId);
			});
			*/

			//this.watchingClient = client;
		},

		stopWatching: function(){
			if (this.watching){

				console.log('Shutting down the async notification watching');
				
				//this.watchingClient.end();

				this.watching = false;

				return this.runner.stop();
			}
			else {
				return Promise.resolve({});
			}
		},

		// will return a number for the message id
		waitForNonStaleResults: function(){
			// TODO -- actually do something here.
			return Promise.delay(1000);
		},

		processQueuedProjectionWork: function(){
			return this.db.transaction(function*(t){
				var status = (yield t.query('select pge_process_async_projections()'))
					.rows[0].pge_process_async_projections;

				console.log(JSON.stringify(status));
				
				return status;
			});
		}

	}, db);

	return processor;
};