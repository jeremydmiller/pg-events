function StoreBase(ctor){
	var stores = {};

	this.initViewStorage = function(type){
		if (stores[type] == null){
			stores[type] = new ctor(type);
		}
	}

	this.forViewType = function(type){
		this.initViewStorage(type);

		return stores[type];
	}

	this.findView = function(type, id){
		return this.forViewType(type).find(id);
	}

	this.updateView = function(type, id, data){
		this.forViewType(type).update(id, data);
	}
}

module.exports = StoreBase;