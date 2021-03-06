

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

		// TODO --  have this take in the stream as {id: stream id, type: stream type}
		// It's GH-13
		processAsyncProjection: function(event, streamId, slot, errors){
			// TODO -- defensive checks
			var plan = projector.library.delayedPlanFor(event.$type);

			// TODO -- this is a bug!
			plan.execute(storage, {id: streamId, type: event.$type}, event, function(err){
				// {event: , projection: , error: ,}
				storage.storeProjectionError(err.event, err.projection, err.error);
				errors.push(err);
			});

			storage.markQueuedEventAsProcessed(slot);
		},

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
		},

		// Naive recapitulation of events and projections
		replayAllEvents: function(){
			storage.warmupViewStores(projector.activeProjectionNames());
			storage.cleanAllViews();
			var allEvents = storage.allEvents();

			var errors = [];

			var onerror = function(err){
				storage.storeProjectionError(err.event, err.projection, err.error);
				errors.push(err);
			}

			for (var i = 0; i < allEvents.length; i++){
				var plan = projector.library.replayPlanFor(allEvents[i].event.$type);
				plan.execute(storage, {id: allEvents[i].id, type: allEvents[i].type}, allEvents[i].event, onerror);
			}

			return errors;
		}

	};
};