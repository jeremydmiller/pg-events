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

		return result.highest > result.lowest;
	}

	var doWork = function(){
		return database.transaction(function*(t){
			var status = (yield t.query('select pge_process_async_projections()'))
				.rows[0].pge_process_async_projections;

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
			if (latched){
				return "done";
			}

			return Promise.delay(250);
		});
	}

	this.processAll = function(){
		// TODO -- add some console logging
		return Promise.coroutine(function*(){
			var errors = [];

			var count = yield rollingBuffer.queuedCount();
			while (count > 0){
				var returnValue = yield doWork();

				errors = errors.concat(returnValue.errors);
				count = yield rollingBuffer.queuedCount();
			}

			return errors;
		})();
	}

	// TODO -- harden this
	this.startWatching = function(){
		console.log("Starting to watch for async notifications");

		latched = false;
		self.resolver = promiseWhile(shouldContinue, runProjections);
		self.watching = true;
	}

	this.stopWatching = function(){
		if (this.watching){

			console.log('Shutting down the async notification watching');

			self.watching = false;

			latched = true;

			return Promise.resolve({});
		}
		else {
			return Promise.resolve({});
		}
	}


}

module.exports = AsyncDaemon;