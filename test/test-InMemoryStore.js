var assert = require("assert")
var projector = require("../lib/projections");



describe('InMemoryStore', function(){
	describe('SimpleStore', function(){
		it('should be able to store and retrieve values by key', function(){
		  	var store = projector.store.byId('something');
		  	store.update('a', 'foo');
		  	store.update('c', 'baz');

		  	assert.equal('foo', store.find('a'));

		  	store.update('a', 'bar');
		  	assert.equal('bar', store.find('a'));
		  
		  	assert.equal('baz', store.find('c'));

		});
	});

	it('should be able to retrieve a store by id', function(){
		projector.store.byId('A').update('a', '1');
		projector.store.byId('B').update('a', '2');
		projector.store.byId('C').update('a', '3');

		assert.equal('1', projector.store.byId('A').find('a'));
		assert.equal('2', projector.store.byId('B').find('a'));
		assert.equal('3', projector.store.byId('C').find('a'));
	});

	it('should be able to retrieve an aggregate by id', function(){
		projector.store.byType().update('A', '1');
		projector.store.byType().update('B', '2');
		projector.store.byType().update('C', '3');

		assert.equal('1', projector.store.byType().find('A'));
		assert.equal('2', projector.store.byType().find('B'));
		assert.equal('3', projector.store.byType().find('C'));
	});
});