

function ExistingStream(persistor, stream){
	this.persistor = persistor;
	this.version = stream.version;
	this.id = stream.id;
	this.type = stream.type;
	this.snapshotVersion = stream.snapshotVersion;
}

ExistingStream.prototype.update = function(events){
	this.persistor.updateStream(this.id, this.version + events.length);
}


function NewStream(persistor, id, type){
	this.persistor = persistor;
	this.type = type;
	this.version = 0;
	this.id = id;
	this.snapshotVersion = 0;
}

NewStream.prototype.update = function(events){
	this.persistor.insertStream(this.id, events.length, this.type);
}



// TODO -- blow up if stream type cannot be determined
module.exports = function(persistor, projector){
	// TODO -- TEMP!
	projector.store = persistor;

	return {
		findStream: function(message, events){
			var id = message.id || persistor.newId();
			
			var existing = persistor.findStream(id);
			if (existing == null){
				var streamType = message.type || projector.streamTypeForEvent(events[0].$type);
				if (streamType == null){
					throw new Error('The stream type is unspecified. The known streams are: ' + aggregates.names.join(', '));
				}

				return new NewStream(persistor, id, streamType);
			}
			else{
				return new ExistingStream(persistor, existing);
			}
		},

		// TODO -- blow up if id is null?
		// TODO -- do the optimistic version check
		// TODO -- blow up if eventType is completely missing?
		store: function(message){
			var events = message.data;
			if (!(events instanceof Array)){
				events = [events];
			}

			var stream = this.findStream(message, events);

			stream.update(events);
			var next = stream.version;
			for (var i = 0; i < events.length; i++){
				next = next + 1;
				var evt = events[i];

				if (evt.$id == null){
					evt.$id = persistor.newId();
				}

				if (evt.$type == null){
					throw new Error("Missing the $type information on event: " + JSON.stringify(evt));
				}

				persistor.appendEvent(stream.id, next, evt, evt.$type, evt.$id);
				projector.captureEvent(stream.id, stream.type, evt);
			}
/*
			if (projector.requiresSnapshotUpdate(stream.type, next, stream.snapshotVersion)){
				projector.rebuild(persistor, stream.id);
			}
*/
			return {id: stream.id, version: next};
		},

	};
};