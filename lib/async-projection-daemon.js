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


function AsyncDaemon(connectionString){
	lastProcessed = 0;
	current = 0;
	latched = false;
	var self = this;
	this.running = false;

	var database = new Database(connectionString);
	var rollingBuffer = new RollingBuffer(database);

	var shouldContinue = function(){
		return !latched;
	}

	var shouldFetchAgain = function(result){
		if (latched) return false;

		if (result.highest == 0) return false;

		return result.highest > result.processed;
	}

	var doWork = function(){
		return database.transaction(function*(t){
			var status = (yield t.query('select pge_process_async_projections()'))
				.rows[0].pge_process_async_projections;

			console.log(JSON.stringify(status));

			return status;
		});
	}

	// TODO -- make the "cooldown" time configurable
	var runProjections = function(){
		return Promise.coroutine(function*(){
			var result = yield doWork();
			while (shouldFetchAgain(result)){
				result = yield doWork();
			}
		})().then(function(){
			if (latched) return Promise.resolve('done');

			return Promise.delay(1000);
		});
	}

	this.processAll = function(){
		// TODO -- add some console logging
		return Promise.coroutine(function*(){
			var count = yield rollingBuffer.queuedCount();
			while (count > 0){
				var returnValue = yield doWork();
				count = yield rollingBuffer.queuedCount();
			}
		})();
	}

	// TODO -- harden this
	this.startWatching = function(){
		console.log("Starting to watch for async notifications");

		latched = false;
		self.resolver = promiseWhile(shouldContinue, runProjections);
		self.watching = true;

		var client = new pg.Client(connectionString);
		
		client.connect();
		client.query('LISTEN "pge_event_queued"');
		client.on('notification', function(data) {
			// Not trying for perfect here
			var messageId = parseInt(data.payload);

			if (messageId > current){
				current = messageId;
			}
		});
		

		self.watchingClient = client;
	}

	this.stopWatching = function(){
		if (this.watching){

			console.log('Shutting down the async notification watching');
			
			self.watchingClient.end();

			self.watching = false;

			latched = true;

			return self.resolver.promise;
		}
		else {
			return Promise.resolve({});
		}
	}

	// will return a number for the message id
	this.waitForNonStaleResults = function(){
		// TODO -- actually do something here.
		return Promise.delay(1000);
	}

}

module.exports = AsyncDaemon;