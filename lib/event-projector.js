
function EventProjector(name, transform, store){
	this.name = name;
	this.transform = transform;
	this.store = store;
}

EventProjector.prototype.processEvent = function(id, evt){
	var view = this.transform(evt);
	this.store.update(view.$id, view);
}

module.exports = EventProjector;