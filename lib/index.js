
var pg = require('pg');
var Promise = require("bluebird");
var uuid = require('node-uuid');

var Database = require('postgres-gen');


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


function RollingBuffer(db){
	this.db = db;

	this.queuedCount = function(){
		return db.query('SELECT count(*) as count from pge_rolling_buffer where reference_count = 1')
			.then(function(result){
				return parseInt(result.rows[0].count);
			});

	}

	this.queuedEvents = function(){
		return db.query('select event_id as event, stream_id as stream from pge_rolling_buffer where reference_count = 1')
			.then(function(result){
				return result.rows;
			});
	}
}



module.exports = {
	rollingBuffer: function(){
		return new RollingBuffer(this.db);
	},

	newEvent: function(type){
		return {$type: type, $id: uuid.v4()};
	},

	toEventMessage: function(arguments){
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
	},

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

	fetchStream: function(id){
		return this.db.query('select pge_fetch_stream(?)', id)
			.then(function(results){
				return results.rows[0].pge_fetch_stream;
			});
	},

	query: function(sql, args){
		if (args.length == 0){
			return this.db.query(sql);
		}

		return this.db.query(sql, args);
	},

	fetchView: function(id, view){
		if (view == null){
			throw new Error('view cannot be null');
		}

		return this.db.query('select pge_find_view(?, ?)', id, view).then(function(results){
			return results.rows[0].pge_find_view;
		})
	},

	fetchCurrentSnapshot: function(id){
		return this.db.query('select snapshot from pge_streams where id = ?', id)
			.then(function(results){
				if (results.rows.length == 0) return null;

				return results.rows[0].snapshot;
			});
	},

	fetchLatestAggregate: function(id){
		return this.db.query('select pge_fetch_latest_aggregate(?)', id)
			.then(function(results){
				if (results.rows.length == 0) return null;

				return results.rows[0].pge_fetch_latest_aggregate;
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

};