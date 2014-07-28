var assert = require('chai').assert;
var expect = require('chai').expect;
var projector = require("../lib/projections");
var InMemoryStore = require("../lib/in-memory-store");


describe('The Projector', function(){
	beforeEach(function(){
		projector.reset();
		projector.store = new InMemoryStore();

		projector
			.projectStream('Quest')
			.named('Party')
			.by({
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
			.projectEvent('TownReached')
			.named('Arrival')
			.by(function(evt){
				return {
					town: evt.location
				};
			});

		projector
			.projectAcrossStreams('Traveled')
			.by({
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


		projector.processEvent(1, 'Quest', {$type: 'QuestStarted', location: "Emond's Field"});
		projector.processEvent(2, 'Quest', {$type: 'QuestStarted', location: "Rivendell"});

		projector.processEvent(1, 'Quest', {$type: 'TownReached', location: "Baerlon", traveled: 4});
		projector.processEvent(2, 'Quest', {$type: 'TownReached', location: "Moria", traveled: 100});

		projector.processEvent(1, 'Quest', {$type: 'EndOfDay', traveled: 13});

		projector.processEvent(1, 'Quest', {$type: 'QuestEnded', location: 'The Eye of the World'});


	});

	
	it('should execute projections by stream', function(){
		expect(projector.store.find('Party', 1)).to.deep.equal({
			active:false, location: 'The Eye of the World', traveled: 17});

		expect(projector.store.find('Party', 2)).to.deep.equal({
			active:true, location: 'Moria', traveled: 100});
	});

	
});