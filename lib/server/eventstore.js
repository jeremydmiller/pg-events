

function ExistingStream(storage, stream){
	this.storage = storage;
	this.version = stream.version;
	this.id = stream.id;
	this.type = stream.type;
	this.snapshotVersion = stream.snapshotVersion;
}

ExistingStream.prototype.update = function(events){
	this.storage.updateStream(this.id, this.version + events.length);
}


function NewStream(storage, id, type){
	this.storage = storage;
	this.type = type;
	this.version = 0;
	this.id = id;
	this.snapshotVersion = 0;
}

NewStream.prototype.update = function(events){
	this.storage.insertStream(this.id, events.length, this.type);
}



// TODO -- blow up if stream type cannot be determined
module.exports = function(storage, projector){
	return {
		findStream: function(message, events){
			var id = message.id || storage.newId();

			var existing = storage.findStream(id);

			if (existing == null){
				var streamType = message.type || projector.streamTypeForEvent(events[0].$type);

				if (streamType == null){
					throw new Error('The stream type is unspecified. The known streams are: ' + aggregates.names.join(', '));
				}

				return new NewStream(storage, id, streamType);
			}
			else{
				return new ExistingStream(storage, existing);
			}
		},

		// TODO -- blow up if id is null?
		// TODO -- do the optimistic version check
		// TODO -- blow up if eventType is completely missing?
		store: function(message){
			var events = message.data;
			var stream = this.findStream(message, events);

			stream.update(events);
			var next = stream.version;
			for (var i = 0; i < events.length; i++){
				next = next + 1;
				var evt = events[i];

				if (evt.$id == null){
					evt.$id = storage.newId();
				}

				if (evt.$type == null){
					throw new Error("Missing the $type information on event: " + JSON.stringify(evt));
				}

				storage.appendEvent(stream.id, next, evt, evt.$type, evt.$id);
				projector.captureEvent(storage, stream, evt);

			}

			storage.updateStream(stream.id, next);
			stream.version = next;


			if (projector.requiresSnapshotUpdate(stream.type, next, stream.snapshotVersion)){
				projector.rebuildSnapshot(storage, stream);
			}

			return {id: stream.id, version: next};
		},

		buildAggregate: function(id){
			return projector.buildLatestAggregate(storage, id);
		}

	};
};