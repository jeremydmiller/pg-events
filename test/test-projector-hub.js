var assert = require('chai').assert;
var expect = require('chai').expect;
var projector = require("../lib/projections");
var InMemoryStore = require("../lib/in-memory-store");


describe('The Projector', function(){
	var store = null;

	beforeEach(function(){
		projector.reset();
		store = new InMemoryStore();

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

		projector
			.projectEvent({
				event: 'TownReached',
				name: 'Arrival',
				transform: function(evt){
					return {
						town: evt.location
					};
				},
				async: false
			});

		projector
			.projectAcrossStreams({
				name: 'Traveled',
				$init: function(){
					return {
						traveled: 0
					};
				},

				TownReached: function(state, evt){
					state.traveled += evt.traveled;
				},

				EndOfDay: function(state, evt){
					state.traveled += evt.traveled;
				}
			});

		projector.library.compile();

		projector.processEvent(store, {id: 1, type: 'Quest'}, {$type: 'QuestStarted', location: "Emond's Field"});
		projector.processEvent(store, {id: 2, type: 'Quest'}, {$type: 'QuestStarted', location: "Rivendell"});

		projector.processEvent(store, {id: 1, type: 'Quest'}, {$type: 'TownReached', location: "Baerlon", traveled: 4});
		projector.processEvent(store, {id: 2, type: 'Quest'}, {$type: 'TownReached', location: "Moria", traveled: 100});

		projector.processEvent(store, {id: 1, type: 'Quest'}, {$type: 'EndOfDay', traveled: 13});

		projector.processEvent(store, {id: 1, type: 'Quest'}, {$type: 'QuestEnded', location: 'The Eye of the World'});


	});

	
	it('should execute projections by stream', function(){
		expect(store.findView('Party', 1)).to.deep.equal({
			active:false, location: 'The Eye of the World', traveled: 17});

		expect(store.findView('Party', 2)).to.deep.equal({
			active:true, location: 'Moria', traveled: 100});
	});

	
});