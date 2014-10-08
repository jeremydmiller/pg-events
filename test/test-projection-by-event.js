var assert = require('chai').assert;
var expect = require('chai').expect;
var projector = require("../lib/projections");
var InMemoryStore = require("../lib/in-memory-store");
var sinon = require('sinon');


describe('Projecting an event', function(){
	it('should transform and event and place it in the right store', function(){
		var id = 0;

		var store = new InMemoryStore();

		var projection = projector.projectEvent({
			event: 'TownReached',
			name: 'Arrival',
			async: false,
			transform: function(evt){
				id = id + 1;

				return {
					town: evt.location,
					$id: id
				};
			}
		});


		projection.processEvent(store, 1, {$id: 1, location: "Caemlyn"});
		projection.processEvent(store, 2, {$id: 2, location: "Four Kings"});
		projection.processEvent(store, 3, {$id: 3, location: "Whitebridge"});

		expect(store.findView(projection.name, 1)).to.deep.equal({$id: 1, town: "Caemlyn"});
		expect(store.findView(projection.name, 2)).to.deep.equal({$id: 2, town: "Four Kings"});
		expect(store.findView(projection.name, 3)).to.deep.equal({$id: 3, town: "Whitebridge"});
	});

	it('accept a visitor for async', function(){
		var visitor = {
			asyncByEvent: sinon.spy()
		}

		var projection = projector.projectEvent({
			event: 'TownReached',
			name: 'Arrival',
			async: true,
			transform: function(evt){
				id = id + 1;

				return {
					town: evt.location,
					$id: id
				};
			}
		});

		projection.acceptVisitor(visitor);

		expect(visitor.asyncByEvent.getCall(0).args[0]).to.equal(projection);

	});

	it('queues an entry for processing an event in async mode', function(){
		var projection = projector.projectEvent({
			event: 'TownReached',
			name: 'Arrival',
			async: true,
			transform: function(evt){
				id = id + 1;

				return {
					town: evt.location,
					$id: id
				};
			}
		});

		var store = {
			queueProjectionEvent: sinon.spy()
		}

		var id = 1;
		var evt = {$id: 2};

		projection.processEvent(store, id, evt);

		var call = store.queueProjectionEvent.getCall(0);

		expect(call.args).to.deep.equal([projection.name, id, evt.$id]);
	});

	it('accept a visitor for sync', function(){
		var visitor = {
			syncByEvent: sinon.spy()
		}

		var projection = projector.projectEvent({
			event: 'TownReached',
			name: 'Arrival',
			async: false,
			transform: function(evt){
				id = id + 1;

				return {
					town: evt.location,
					$id: id
				};
			}
		});

		projection.acceptVisitor(visitor);

		expect(visitor.syncByEvent.getCall(0).args[0]).to.equal(projection);

	});

	it('should be async by default', function(){
		var projection = projector.projectEvent({
			event: 'TownReached',
			name: 'Arrival',
			//async: false,
			transform: function(evt){
				id = id + 1;

				return {
					town: evt.location,
					$id: id
				};
			}
		});

		expect(projection.async).to.be.true;
	});

	it('can be sync', function(){
		var projection = projector.projectEvent({
			event: 'TownReached',
			name: 'Arrival',
			async: false,
			transform: function(evt){
				id = id + 1;

				return {
					town: evt.location,
					$id: id
				};
			}
		});

		expect(projection.async).to.be.false;
	});
});

