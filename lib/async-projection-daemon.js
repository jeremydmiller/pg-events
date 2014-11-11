var pg = require('pg');
var Promise = require("bluebird");
var uuid = require('node-uuid');

var Database = require('postgres-gen');
var PostgresService = require('./pg-service');
var RollingBuffer = require('./rolling-buffer');
var JSPipe = require('jspipe');

Object.keys(pg).forEach(function(key) {
	if (key == "native") return;

    var Class = pg[key];
    if (typeof Class === "function") {
        Promise.promisifyAll(Class.prototype);
        Promise.promisifyAll(Class);
    }
})
Promise.promisifyAll(pg);


function Daemon(process, cooldown){
	var timeout = JSPipe.timeout;
	var job = JSPipe.job;

	this.processed = 0;
	this.queued = 0;

	this.statusPipe = new JSPipe.Pipe();
	this.processPipe = new JSPipe.Pipe();

	job(function*(){

	});

	job(function*(){

	});
}


module.exports = function(db){
	var processor = new PostgresService({
		lastProcessed: 0,
		current: 0,

		processAll: function(){
			var rollingBuffer = new RollingBuffer(this.db);
			var self = this;

			// TODO -- add some console logging
			return Promise.coroutine(function*(){
				var count = yield rollingBuffer.queuedCount();
				while (count > 0){
					var returnValue = yield self.processQueuedProjectionWork();
					console.log('Return from processing is ' + JSON.stringify(returnValue));

					count = yield rollingBuffer.queuedCount();
				}
			})();
		},

		// TODO -- harden this
		startWatching: function(){
			console.log("Starting to watch for async notifications");

			var client = new pg.Client(this.db.connectionString());
			client.connect();
			client.query('LISTEN "pge_event_queued"');
			client.on('notification', function(data) {
				// Not trying for perfect here
				var messageId = parseInt(data.payload);

			    console.log('Last message id was ' + messageId);
			});


			this.watchingClient = client;
		},

		stopWatching: function(){
			if (this.watchingClient){
				console.log('Shutting down the async notification watching');
				this.watchingClient.end();
			}
		},

		// will return a number for the message id
		waitForNonStaleResults: function(){
			// TODO -- actually do something here.
			return Promise.resolve(0);
		}

	}, db);

	processor.findFunctionResult('processQueuedProjectionWork', 'pge_process_async_projections', []);


	return processor;
};