
var assert = require('chai').assert;
var expect = require('chai').expect;
var projector = require("../lib/projections");
var InMemoryStore = require("../lib/in-memory-store");
projector.store = new InMemoryStore();

var sinon = require('sinon');


describe('Projections by Stream', function(){
	it('uses a default $init function if none is provided', function(){
		var projection = projector
			.projectStream({
				name: 'Party',
				stream: 'Quest'
			});

		var state = projection.applyEvent(null, {$type: 'QuestStarted'});
		assert.notEqual(null, state);
	});

	it('accepts a visitor in async mode', function(){
		var visitor = {
			asyncByStream: sinon.spy()
		}

		var projection = projector
			.projectStream({
				name: 'Party',
				stream: 'Quest',
				mode: 'async'
			});

		projection.acceptVisitor(visitor);

		expect(visitor.asyncByStream.getCall(0).args[0]).to.equal(projection);
	});


	it('accepts a visitor in sync mode', function(){
		var visitor = {
			syncByStream: sinon.spy()
		}

		var projection = projector
			.projectStream({
				name: 'Party',
				stream: 'Quest',
				mode: 'sync'
			});

		projection.acceptVisitor(visitor);

		expect(visitor.syncByStream.getCall(0).args[0]).to.equal(projection);
	});

	it('should be async by default', function(){
		var projection = projector
			.projectStream({
				name: 'Party',
				stream: 'Quest'
			});

		expect(projection.mode).to.equal('async');
	});

	it('should be able to be set to sync', function(){
		var projection = projector
			.projectStream({
				name: 'Party',
				stream: 'Quest',
				mode: 'sync'
			});

		expect(projection.mode).to.equal('sync');
	});

	describe('Simple Projection', function(){
		projector
			.projectStream({
				name: 'Party',
				stream: 'Quest',
				mode: 'sync',

				$init: function(){
					return {
						active: true,
						traveled: 0,
						location: null
					}
				},

				QuestStarted: function(state, evt){
					state.active = true;
					state.location = evt.location; 
				},

				TownReached: function(state, evt){
					state.location = evt.location;
					state.traveled += evt.traveled;
				},

				EndOfDay: function(state, evt){
					state.traveled += evt.traveled;
				},

				QuestEnded: function(state, evt){
					state.active = false;
					state.location = evt.location;
				},


			});


		var projection = projector.projections['Party'];

		describe('Projecting a single event', function(){
			it('should use the $init function if it exists to start the projection', function(){
				var initial = projection.applyEvent(null, {$type: 'QuestStarted', location: "Emond's Field"});
				expect(initial).to.deep.equal({active: true, traveled :0, location: "Emond's Field"});
			});

			it('should apply a single transform for the event type', function(){
				var state = projection.applyEvent(null, {$type: 'TownReached', location: "Baerlon", traveled: 4});
				expect(state).to.deep.equal({active: true, location: "Baerlon", traveled: 4});

			});
		});

		describe('Projecting a stream of events', function(){
			it('should apply each event to a single aggregate', function(){
				var state = projection.createSnapshot([
					{$type: 'QuestStarted', location: "Emond's Field"},
					{$type: 'EndOfDay', traveled: 3},
					{$type: 'EndOfDay', traveled: 5},
					{$type: 'TownReached', location: "Baerlon", traveled: 4}
				]);

				expect(state).to.deep.equal({
					location: "Baerlon", 
					traveled: 12,
					active: true
				});
			});
		});

		describe('Applying events to existing streams', function(){
			var store = new InMemoryStore();

			projection.processEvent(store, 1, {$type: 'QuestStarted', location: "Emond's Field"});
			projection.processEvent(store, 2, {$type: 'QuestStarted', location: "Rivendell"});

			projection.processEvent(store, 1, {$type: 'TownReached', location: "Baerlon", traveled: 4});
			projection.processEvent(store, 2, {$type: 'TownReached', location: "Moria", traveled: 100});

			projection.processEvent(store, 1, {$type: 'EndOfDay', traveled: 13});


			var state1 = store.findView(projection.name, 1);
			expect(state1).to.deep.equal({location: 'Baerlon', active: true, traveled: 17});


			var state2 = store.findView(projection.name, 2);
			expect(state2).to.deep.equal({location: 'Moria', active: true, traveled: 100});



		});


	});


});