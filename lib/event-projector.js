
function EventProjector(name, transform){
	this.name = name;
	this.transform = transform;
}

EventProjector.prototype.processEvent = function(store, id, evt){
	var view = this.transform(evt);
	store.updateView(this.name, view.$id, view);
}

module.exports = EventProjector;