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


module.exports = function(db){
	var processor = new PostgresService({
		processAll: function(){
			var rollingBuffer = new RollingBuffer(this.db);
			var self = this;

			// TODO -- add some console logging
			return Promise.coroutine(function*(){
				var count = yield rollingBuffer.queuedCount();
				while (count > 0){
					yield self.processQueuedProjectionWork();
					count = yield rollingBuffer.queuedCount();
				}
			})();
		}

	}, db);

	processor.findFunctionResult('processQueuedProjectionWork', 'pge_process_async_projections', []);


	return processor;
};