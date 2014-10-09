var expect = require('chai').expect;
var ProjectionLibrary = require('./../lib/projection-library');

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