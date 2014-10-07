var assert = require('chai').assert;
var expect = require('chai').expect;
var projector = require("../lib/projections");
var InMemoryStore = require("../lib/in-memory-store");
var sinon = require('sinon');

describe('Aggregates across Streams', function(){
	var store = new InMemoryStore();

	var projection = projector
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

	it('should accept a visitor', function(){
		var visitor = {
			aggregate: sinon.spy()
		}

		projection.acceptVisitor(visitor);

		expect(visitor.aggregate.getCall(0).args[0]).to.equal(projection);
	});

	it('should be able to store and retrieve aggregates', function(){
		store.storeAggregate("foo", {a: 1});
		expect(store.findAggregate("foo")).to.deep.equal({a: 1});
	});

	it('should aggregate across all streams', function(){
		projector.processEvent(store, 1, 'anything', {$type: 'QuestStarted', location: "Emond's Field"});
		projector.processEvent(store, 2, 'anything', {$type: 'QuestStarted', location: "Rivendell"});

		projector.processEvent(store, 1, 'anything', {$type: 'TownReached', location: "Baerlon", traveled: 4});
		projector.processEvent(store, 2, 'anything', {$type: 'TownReached', location: "Moria", traveled: 100});

		projector.processEvent(store, 1, 'anything', {$type: 'EndOfDay', traveled: 13});

		var aggregate = store.findAggregate('Traveled');
		expect(aggregate).to.deep.equal({traveled: 117});
	});
});