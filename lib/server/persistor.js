function ProjectionStore(type){
	this.insertSql = 'insert into pge_projections_* (id, data) values ($1, $2)'.replace('*', type);
	this.updateSql = 'update pge_projections_* set data = $2 where id = $1'.replace('*', type);
	this.findSql = 'select data from pge_projections_* where id = $1'.replace('*', type);
	this.cleanSql = 'truncate table pge_projections_* CASCADE'.replace('*', type);

	this.type = type;

	return this;
};

// TODO -- come harden everything against failures
ProjectionStore.prototype.find = function(id){
	var rows = plv8.execute(this.findSql, [id]);
	if (rows.length == 0) return null;

	return rows[0].data;
};

ProjectionStore.prototype.update = function(id, data){
	var count = plv8.execute(this.updateSql, [id, data]);
	if (count == 0){
		plv8.execute(this.insertSql, [id, data]);
	}
};

ProjectionStore.prototype.cleanAll = function(){
	plv8.execute(this.cleanSql);
};


module.exports = {
	newId: function(){
		var raw = plv8.execute('select uuid_generate_v1mc()');
		return raw[0].uuid_generate_v1mc;
	},

	findStream: function(id){
		if (id == null) return null;

		var raw = plv8.execute('select version, type, snapshot_version from pge_streams where id = $1', [id]);
		if (raw.length == 0) return null;

		return {version: parseInt(raw[0].version), type: raw[0].type, id: id, snapshotVersion: raw[0].snapshot_version};
	},

	insertStream: function(id, version, streamType){
		plv8.execute("insert into pge_streams (id, version, type) values ($1, $2, $3)", [id, version, streamType]);
	},

	updateStream: function(id, version){
		plv8.execute("update pge_streams set version = $1 where id = $2", [version, id]);
	},

	appendEvent: function(streamId, version, data, eventType, eventId){
		if (eventId == null){
			eventId = this.newId();
			data.$id = eventId;
		}

		plv8.execute("insert into pge_events (stream_id, id, version, data, type) values ($1, $2, $3, $4, $5)",
			[streamId, eventId, version, JSON.stringify(data), eventType]);
	},

	findLatest: function(id){
		var rows = plv8.execute('select snapshot, snapshot_version, type from pge_streams where id = $1', [id]);
		if (rows.length == 0){
			throw 'Unable to find a stream with id ' + id;
		}

		return {version: rows[0].snapshot_version, data: rows[0].snapshot, type: rows[0].type};
	},

	persistSnapshot: function(id, data, version){
		var count = plv8.execute('update pge_streams set snapshot = $1, snapshot_version = $2 where id = $1', [data, version, id]);
		if (count == 0){
			throw 'No matching stream for id = ' + id;
		}
	},

	findEventsAfter: function(id, version){
		return plv8.execute('select data, version from pge_events where id = $1 and version > $2 order by version', [id, version]);
	},

	findEventsUpTo: function(id, version){
		var rows = plv8.execute('select data, version from pge_events where id = $1 and version > $2 order by version', [id, version]);
		return rows.map(function(row){
			return row.data;
		});
	},

	stores: {},

	buildProjectionStores: function(views){
		for (var i = 0; i < views.length; i++){
			this.stores[views[i]] = new ProjectionStore(views[i]);
		}
	},

	byId: function(type){
		if (this.stores[type]){
			return this.stores[type];
		}

		var store = new ProjectionStore(type);

		this.stores[type] = store;

		return store;
	},

	byType: function(){
		var self = this;

		return {
			find: self.findAggregate,
			update: self.storeAggregate,
			requireStorage: function(graph){
				// do nothing
			}
		};
	},

	findAggregate: function(name){
		var rows = plv8.execute('select data from pge_aggregates where name = $1', [name]);
		
		if (rows.length == 0) return null;
		return rows[0].data;
	},

	storeAggregate: function(name, data){
		var count = plv8.execute("update pge_aggregates set data = $2 where name = $1", [name, data]);
		if (count == 0){
			plv8.execute("insert into pge_aggregates (name, data) values ($1, $2)", [name, data]);		
		}
	},

	find: function(type, id){
		return this.stores[type].find(id);
	},

	// TODO -- this probably shouldn't be available in production mode
	cleanAll: function(){
		plv8.execute('truncate table pge_aggregates CASCADE');

		for (key in this.stores){
			this.stores[key].cleanAll();
		}
	}
};