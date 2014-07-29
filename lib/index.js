
var pg = require('pg');
var Promise = require("bluebird");
var uuid = require('node-uuid');

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


module.exports = {
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
	},

	// TODO -- do some validation on event type, stream id
	append: function(){
		var message = this.toEventMessage(arguments);

		return pg.connectAsync(this.options.connection).spread(function(client, release){
			return client.queryAsync('select pge_append_event($1)', [message])
				.finally(release);
		})
		.then(function(result){
			return Promise.resolve(result.rows[0].pge_append_event);
		});
	},

	fetchStream: function(id){
		return pg.connectAsync(this.options.connection).spread(function(client, release){
			return client.queryAsync('select pge_fetch_stream($1)', [id])
				.then(function(results){
					return results.rows[0].pge_fetch_stream;

				})
				.finally(release);
		});
	},



	fetchView: function(id, view){
		return pg.connectAsync(this.options.connection).spread(function(client, release){
			return client.queryAsync('select pge_find_view($1, $2)', [id, view])
				.then(function(results){
					return results.rows[0].pge_find_view;
				})
				.finally(release);
		});
	},

	fetchCurrentSnapshot: function(id){
		return pg.connectAsync(this.options.connection).spread(function(client, release){
			return client.queryAsync('select snapshot from pge_streams where id = $1', [id])
				.then(function(results){
					if (results.rows.length == 0) return null;

					return results.rows[0].snapshot;
				})
				.finally(release);
		});
	},

	fetchLatestAggregate: function(id){
		return pg.connectAsync(this.options.connection).spread(function(client, release){
			return client.queryAsync('select pge_fetch_latest_aggregate($1)', [id])
				.then(function(results){
					if (results.rows.length == 0) return null;

					return results.rows[0].pge_fetch_latest_aggregate;
				})
				.finally(release);
		});
	},

	config:{
		cleanAll: function(){
			return pg.connectAsync(this.options.connection).spread(function(client, release){
				return client.queryAsync('select pge_clean_all_events()')
					.finally(release);
			});
		},

		seedAll: function(){
			var seeder = require('./seeder.js');
			return seeder.seedAll(this.options);
		}
	},

};