var expect = require('chai').expect;
var ProjectionLibrary = require('./../lib/projection-library');
var _ = require('lodash');

describe('ProjectionLibrary', function(){
	describe('when determining all events', function(){
		it('should get events from aggregates', function(){
			var library = new ProjectionLibrary();

			library.addStream({name: 'foo', events: ['a', 'b', 'c']});
			library.addStream({name: 'bar', events: ['b', 'c', 'd']});

			expect(library.allEvents()).to.deep.equal(['a', 'b', 'c', 'd']);
		});
	

		it('should get events from projections', function(){
			var library = new ProjectionLibrary();
			library.add({name: 'foo', events: ['a', 'b', 'c']});
			library.add({name: 'bar', events: ['b', 'c', 'd']});

			expect(library.allEvents()).to.deep.equal(['a', 'b', 'c', 'd']);
		});

		it('should get events from a mix of aggregates and projections', function(){
			var library = new ProjectionLibrary();

			library.addStream({name: 'foo', events: ['a', 'b', 'c']});
			library.addStream({name: 'bar', events: ['b', 'c', 'd']});

			library.add({name: 'foo', events: ['a', 'b', 'c']});
			library.add({name: 'bar', events: ['b', 'c', 'd', 'e']});

			expect(library.allEvents()).to.deep.equal(['a', 'b', 'c', 'd', 'e']);
		});
	});

	function FakeProjection(name, mode, events){
		this.name = name;
		this.mode = mode;
		this.events = events;

		this.acceptVisitor = function(v){
			v.byStream(this);
		}
	}

	it.only('builds a combined plan for rebuilding', function(){
		var library = new ProjectionLibrary();


		library.add(new FakeProjection('foo', 'sync', ['a', 'b', 'c']));
		library.add(new FakeProjection('bar', 'async', ['b', 'c', 'd']));
		library.add(new FakeProjection('baz', 'async', ['b', 'c', 'd']));
		library.add(new FakeProjection('boo', 'live', ['a', 'b', 'c']));

		library.compile();

		var plan = library.replayPlanFor('b');
		var names = _.map(plan.projections, function(x){return x.name;});

		expect(names).to.deep.equal(['foo', 'bar', 'baz']);
	});

	it('can get stream type for event', function(){
		var library = new ProjectionLibrary();

		library.addStream({name: 'foo', events: ['a', 'b', 'c']});
		library.addStream({name: 'bar', events: ['d']});
		library.addStream({name: 'baz', events: ['e', 'f']});

		expect(library.streamTypeForEvent('a')).to.equal('foo');
		expect(library.streamTypeForEvent('d')).to.equal('bar');
		expect(library.streamTypeForEvent('f')).to.equal('baz');
	});

});