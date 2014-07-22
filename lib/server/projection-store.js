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

ProjectionStore.prototype.requireStorage = function(graph){
	// only really applies to the client as you're setting up
	// the DDL generation, so do nothing
};

ProjectionStore.prototype.cleanAll = function(){
	plv8.execute(this.cleanSql);
};


module.exports = {
	stores: {},

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

