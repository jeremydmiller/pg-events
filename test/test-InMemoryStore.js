var assert = require("assert")
var store = require("../lib/in-memory-store")();



describe('InMemoryStore', function(){
	describe('SimpleStore', function(){
		it('should be able to store and retrieve values by key', function(){
		  	store.updateView('quest', 'a', 'foo');
		  	store.updateView('quest', 'c', 'baz');

		  	assert.equal('foo', store.findView('quest', 'a'));

		  	store.updateView('quest', 'a', 'bar');
		  	assert.equal('bar', store.findView('quest', 'a'));
		  
		  	assert.equal('baz', store.findView('quest', 'c'));

		});
	});

	it('should be able to retrieve a store by id', function(){
		store.updateView('A', 'a', '1');
		store.updateView('B', 'a', '2');
		store.updateView('C', 'a', '3');

		assert.equal('1', store.findView('A', 'a'));
		assert.equal('2', store.findView('B', 'a'));
		assert.equal('3', store.findView('C', 'a'));
	});

	it('should be able to retrieve an aggregate by id', function(){
		store.storeAggregate('A', '1');
		store.storeAggregate('B', '2');
		store.storeAggregate('C', '3');

		assert.equal('1', store.findAggregate('A'));
		assert.equal('2', store.findAggregate('B'));
		assert.equal('3', store.findAggregate('C'));
	});
});