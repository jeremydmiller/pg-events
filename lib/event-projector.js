
function EventProjector(name, transform){
	this.name = name;
	this.transform = transform;
	this.async = true;
}

EventProjector.prototype.processEvent = function(store, id, evt){
	if (this.async) return; // TEMP!!!!

	var view = this.transform(evt);
	store.updateView(this.name, view.$id, view);
}

EventProjector.prototype.acceptVisitor = function(visitor){
	if (this.async){
		visitor.asyncByEvent(this);
	}
	else {
		visitor.syncByEvent(this);
	}
}

module.exports = EventProjector;