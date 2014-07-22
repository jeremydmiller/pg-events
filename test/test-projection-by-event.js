var assert = require('chai').assert;
var expect = require('chai').expect;
var projector = require("../lib/projections");


describe('Projecting an event', function(){
	it('should transform and event and place it in the right store', function(){
		var id = 0;

		var projection = projector
			.projectEvent('TownReached')
			.named('Arrival')
			.by(function(evt){
				id = id + 1;

				return {
					town: evt.location,
					$id: id
				};
			});


		projection.processEvent(1, {$id: 1, location: "Caemlyn"});
		projection.processEvent(2, {$id: 2, location: "Four Kings"});
		projection.processEvent(3, {$id: 3, location: "Whitebridge"});

		expect(projection.store.find(1)).to.deep.equal({$id: 1, town: "Caemlyn"});
		expect(projection.store.find(2)).to.deep.equal({$id: 2, town: "Four Kings"});
		expect(projection.store.find(3)).to.deep.equal({$id: 3, town: "Whitebridge"});
	});
});