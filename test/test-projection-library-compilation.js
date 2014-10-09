var expect = require('chai').expect;
var harness = require('./harness');
var projections = require('./../lib/projections');

describe('ProjectionLibrary compilation', function(){
	before(function(){
		return harness.seed();
	});

	it('should queue events that have an async projection', function(){
		var plan = projections.library.inlinePlanFor('TownReached');
		expect(plan.shouldQueue).to.be.true;
	});

	it('does not need to queue events that do not have any async projection', function(){
		var plan = projections.library.inlinePlanFor('FoeDispatched');
		expect(plan.shouldQueue).to.be.false;
	});
});