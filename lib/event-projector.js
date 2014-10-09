
function EventProjector(config){
	this.name = config.name;
	this.transform = config.transform;
	this.mode = config.mode || 'async';
}

EventProjector.prototype.processEvent = function(store, id, evt){
	if (this.mode == 'async') return; // TEMP!!!!

	var view = this.transform(evt);
	store.updateView(this.name, view.$id, view);
}

EventProjector.prototype.acceptVisitor = function(visitor){
	visitor.byEvent(this);
}

module.exports = EventProjector;