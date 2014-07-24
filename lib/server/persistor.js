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

	persist: function(id, data, version){
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
	}
};