var expect = require('chai').expect;
var EventStore = require("../lib/server/eventstore");
var InMemoryStore = require("../lib/in-memory-store");


function InMemoryProjector(){
	this.events = [];
	this.types = {};

	this.reset = function(){
		this.events = [];
		this.names = [];
		this.types = [];
	};

	this.captureEvent = function(id, type, evt){
		this.events.push({id: id, type: type, evt: evt});
	};

	this.streamTypeForEvent = function(eventType){
		return this.types[eventType];
	}

	this.requiresSnapshotUpdate = function(type, version, snapshotVersion){
		return false;
	}

	this.names = [];

	return this;
}



describe("The EventStore Server Module", function(){
	var persistor = new InMemoryStore();
	var projector = new InMemoryProjector();
	var eventstore = new EventStore(persistor, projector);
	var stream = null;
	var event = null;


	describe('When storing an event for a new stream with explicits for stream type and event id', function(){
		beforeEach(function(){
			persistor.reset();
			projector.reset();

			eventstore.store({
				id: 1,
				type: 'bar',
				data: [{location: 'Rivendell', $type: 'QuestStarted', $id: 4}]
			});

			stream = persistor.findStream(1);
			event = stream.events[0];
		});

		it('should create the new stream with the given stream type, id, and version', function(){

			expect(stream.id).to.equal(1);
			expect(stream.type).to.equal('bar');
			expect(stream.version).to.equal(1);
		});

		it('should capture the first event with the id and event type', function(){
			expect(event).to.deep.equal({location: 'Rivendell', $id: 4, $type: 'QuestStarted'});
		});

		it('should delegate to the projection', function(){
			expect(persistor.findStream(1).events[0]).to.deep.equal({location: 'Rivendell', $id:4, $type: 'QuestStarted'});
		});
	});

	describe('When storing an event for a new stream with no explicits for stream type and event id', function(){
		beforeEach(function(){
			persistor.reset();
			projector.reset();

			projector.types['QuestStarted'] = 'Quest';

			eventstore.store({
				id: 1,
				data: [{location: 'Rivendell', $type: 'QuestStarted', $id: 4}]
			});

			stream = persistor.findStream(1);
			event = stream.events[0];
		});

		it('should create the new stream determining the stream type', function(){
			expect(stream.type).to.equal('Quest');
		});

		it('should capture the first event with the id and event type', function(){
			expect(event).to.deep.equal({location: 'Rivendell', $id: 4, $type: 'QuestStarted'});
		});

		it('should delegate to the projection', function(){
			expect(persistor.findStream(1).events[0]).to.deep.equal({location: 'Rivendell', $id:4, $type: 'QuestStarted'});
		});
	});

	describe('When storing an event for a new stream with no stream type or event id', function(){
		beforeEach(function(){
			persistor.reset();

			projector.types['QuestStarted'] = 'Quest';

			eventstore.store({
				id: 1,
				data: [{location: 'Rivendell', $type: 'QuestStarted'}]
			});

			stream = persistor.findStream(1);
			event = stream.events[0];
		});

		it('should create the new stream with the default stream type', function(){

			expect(stream.type).to.equal('Quest');
		});

		it('should capture the first event with an auto-generated id', function(){
			expect(event.$id).to.not.be.null;
		});


	});

	describe('When appending an event to an existing stream', function(){
		beforeEach(function(){
			persistor.reset();


			eventstore.store({
				id: 1,
				type: 'Quest',
				data: [{location: 'Rivendell', $type: 'QuestStarted'}]
			});

			eventstore.store({
				id: 1,
				data: [{location: 'Moria', $type: 'TownReached', $id: 6}]
			});

			stream = persistor.findStream(1);
			event = stream.events[1];
		});

		it('should capture the second event', function(){
			expect(event).to.deep.equal({$id: 6, $type: 'TownReached', location: 'Moria'})
		});

		it('should increment the version of the stream', function(){
			expect(stream.version).to.equal(2);
		});
	});
});