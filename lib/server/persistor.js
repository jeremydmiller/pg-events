module.exports = {
	newId: function(){
		var raw = plv8.execute('select uuid_generate_v1mc()');
		return raw[0].uuid_generate_v1mc;
	},

	findStream: function(id){
		if (id == null) return null;

		var raw = plv8.execute('select version, type from pge_streams where id = $1', [id]);
		if (raw.length == 0) return null;

		return {version: parseInt(raw[0].version), type: raw[0].type, id: id};
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
	}
};