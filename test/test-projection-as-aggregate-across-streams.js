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

	it('should aggregate across all streams by queueing updates', function(){
		var store = {
			queueProjectionEvent: sinon.spy()
		}

		var id = 1;
		var evt = {$id: 2};

		projection.processEvent(store, id, evt);

		var call = store.queueProjectionEvent.getCall(0);

		expect(call.args).to.deep.equal([projection.name, id, evt.$id]);
	});
});