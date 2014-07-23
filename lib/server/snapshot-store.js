function SnapshotStore(type){
	this.type = type;

	this.updateSql = 'update pge_streams set snapshot = $1, snapshot_version = $2 where id = $1';
	this.findLatestSql = 'select snapshot, snapshot_version from pge_streams where id = $1';
	this.findEventsAfterSql = 'select data, version from pge_events where id = $1 and version > $2 order by version';
	this.findEventsUpToSql = 'select data, version from pge_events where id = $1 and version > $2 order by version';
}

SnapshotStore.prototype.findLatest = function(id){
	var rows = plv8.execute(this.findLatestSql, [id]);
	if (rows.length == 0){
		throw 'Unable to find a stream with id ' + id;
	}

	return {version: rows[0].snapshot_version, data: rows[0].snapshot};
}

SnapshotStore.prototype.persist = function(id, data, version){
	var count = plv8.execute(this.updateSql, [data, version, id]);
	if (count == 0){
		throw 'No matching stream for id = ' + id;
	}
}

SnapshotStore.prototype.findEventsAfter = function(id, version){
	return plv8.execute(this.findEventsAfterSql, [id, version]);
}

SnapshotStore.prototype.findEventsUpTo = function(id, version){
	var rows = plv8.execute(this.findEventsUpToSql, [id, version]);
	return rows.map(function(row){
		return row.data;
	});
}




module.exports = SnapshotStore;