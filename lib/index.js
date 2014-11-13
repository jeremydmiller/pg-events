
var pg = require('pg');
var Promise = require("bluebird");
var uuid = require('node-uuid');

var Database = require('postgres-gen');
var AsyncDaemon = require('./async-projection-daemon');

Object.keys(pg).forEach(function(key) {
	if (key == "native") return;

    var Class = pg[key];
    if (typeof Class === "function") {
        Promise.promisifyAll(Class.prototype);
        Promise.promisifyAll(Class);
    }
})
Promise.promisifyAll(pg);


function isEvent(o){
	return o.hasOwnProperty('$type');
}


function isUUID(o){
	return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(o);
}


// TODO -- lots of duplication here in how we're using promises against PG
// TODO -- consider moving to generators?


var PostgresService = require('./pg-service');
var RollingBuffer = require('./rolling-buffer');

function toEventMessage(arguments){
	if (arguments.length == 0){
		throw new Error('No event data specified');
	}

	if (arguments.length == 1) return arguments[0];

	var message = {data:[]};


	for (var i = 0; i < arguments.length; i++){
		var arg = arguments[i];
		if (isEvent(arg)){
			message.data.push(arg);
		}
		else if (isUUID(arg)){
			message.id = arg;
		}
		else if (arg instanceof Array){
			arg.forEach(function(x){
				message.data.push(x);
			});
		}
		else{
			message.type = arg;
		}
	}

	if (message.id == null){
		message.id = uuid.v4();
	}

	return message;
}



var client = new PostgresService({
	rollingBuffer: function(){
		return new RollingBuffer(this.db);
	},

	asyncDaemon: function(){
		console.log('connection is ' + this.options.connection);
		return new AsyncDaemon(this.options.connection);
	},

	newEvent: function(type){
		return {$type: type, $id: uuid.v4()};
	},

	waitForNonStaleResults: function(ms){
		return Promise.delay(1000);
		// TODO -- the code below doesn't quite work
		// think it's a transaction / dirty data problem.

		var buffer = this.rollingBuffer();

		var timeout = Promise.delay(ms || 2000);
		return Promise.coroutine(function*(){
			var status = yield buffer.status();

			console.log('status: ' + JSON.stringify(status));

			if (status.latest == 0) return true;

			var starting = status.highest;

			while (timeout.isPending()){
				yield Promise.delay(500);
				var newStatus = yield buffer.status();

				if (newStatus.highest == 0 || newStatus.lowest >= starting) {
					return true;
				}
			}

			return false;

		})();
	},

	toEventMessage: toEventMessage,

	start: function(options){
		this.options = options;
		this.config.options = options;
		this.db = new Database(options.connection);
		this.config.db = this.db;
	},

	// TODO -- do some validation on event type, stream id
	append: function(){
		var message = this.toEventMessage(arguments);

		return this.db.transaction(function*(t){
			return (yield t.query('select pge_append_event(?)', message)).rows[0].pge_append_event;
		});
	},

	fetchCurrentSnapshot: function(id){
		return this.db.query('select snapshot from pge_streams where id = ?', id)
			.then(function(results){
				if (results.rows.length == 0) return null;

				return results.rows[0].snapshot;
			});
	},

	config:{
		cleanAll: function(){
			var file = __dirname + '/sql/reset_events.sql';

			var sql = require('fs').readFileSync(file, "utf8");


			if (this.db == null){
				throw "The Connection has not been set for this client";
			}

			return this.db.query(sql);
		},

		seedAll: function(){
			var seeder = require('./seeder.js');
			return seeder.seedAll(this.options);
		}
	},

	findView: function(){
		if (arguments.length == 2){
			return this.fetchViewById(arguments[0], arguments[1]);
		}
		else {
			return this.fetchViewByName(arguments[0]);
		}
	}
});

client.findFunctionResult('fetchStream', 'pge_fetch_stream', ['id']);


client.findFunctionResult('fetchViewById', 'pge_find_view', ['id', 'view']);
client.findFunctionResult('fetchViewByName', 'pge_find_aggregate_view', ['view_name']);

client.findFunctionResult('fetchLatestAggregate', 'pge_fetch_latest_aggregate', ['id']);

module.exports =client;