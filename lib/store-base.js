function StoreBase(ctor, store){
	if (store == null){
		store = {};
	}

	var stores = {};

	store.initViewStorage = function(type){
		if (stores[type] == null){
			stores[type] = new ctor(type);
		}
	}

	store.forViewType = function(type){
		store.initViewStorage(type);

		return stores[type];
	}

	store.findView = function(type, id){
		return store.forViewType(type).find(id);
	}

	store.updateView = function(type, id, data){
		store.forViewType(type).update(id, data);
	}

	store.warmupViewStores = function(views){
		for (var i = 0; i < views.length; i++){
			store.initViewStorage(views[i]);
		}
	}

	return store;
}

module.exports = StoreBase;