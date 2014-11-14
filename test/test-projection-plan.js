var expect = require('chai').expect;
var ProjectionPlan = require('./../lib/projection-plan');

describe('ProjectionPlan', function(){
	it('should record failures on projections', function(){
		var projection = {
			processEvent: function(){
				throw new Error('you stink!');
			},

			name: 'FakeProjection'
		}

		var plan = new ProjectionPlan('TownReached');
		plan.add(projection);

		var lastError = null;
		var onerror = function(e){
			lastError = e;
		}

		var event = {$id: 1};
		plan.execute(null, null, event, onerror);

		expect(lastError).to.deep.equal({event: event.$id, projection: 'FakeProjection', error: 'Error: you stink!'});
	});
});