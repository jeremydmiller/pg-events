var expect = require('chai').expect;

var Aggregates = require('../lib/projections');

describe('Aggregates', function(){

	beforeEach(function(){
		Aggregates.reset();
	});

	it('can find the stream type by event type', function(){
		Aggregates.aggregate({
			stream: 'Quest',
			QuestStarted: function(s, e){},
			QuestFinished: function(s, e){},
			TownReached: function(s, e){},
		});

		Aggregates.aggregate({
			stream: 'User',
			UserCreated: function(s, e){},
			PasswordChanged: function(s, e){},
			RoleGranted: function(s, e){},
			UserDeactivated: function(s, e){},
		});

		Aggregates.aggregate({
			stream: 'Invoice',
			InvoiceCreated: function(s, e){},
			InvoiceReviewed: function(s, e){},
			InvoiceApproved: function(s, e){},
			InvoicePaid: function(s, e){},
		});

		Aggregates.library.compile();

		expect(Aggregates.streamTypeForEvent('QuestStarted')).to.equal('Quest');
		expect(Aggregates.streamTypeForEvent('QuestFinished')).to.equal('Quest');
		expect(Aggregates.streamTypeForEvent('UserCreated')).to.equal('User');
		expect(Aggregates.streamTypeForEvent('RoleGranted')).to.equal('User');
		expect(Aggregates.streamTypeForEvent('InvoiceReviewed')).to.equal('Invoice');
		expect(Aggregates.streamTypeForEvent('InvoiceApproved')).to.equal('Invoice');
	});

	it('determines whether a snapshot is required with the default age of 5', function(){
		Aggregates.aggregate({
			stream: 'Quest',
			QuestStarted: function(s, e){},
			QuestFinished: function(s, e){},
			TownReached: function(s, e){},
		});

		expect(Aggregates.requiresSnapshotUpdate('Quest', 3, 0)).to.equal(false);
		expect(Aggregates.requiresSnapshotUpdate('Quest', 4, 0)).to.equal(false);
		expect(Aggregates.requiresSnapshotUpdate('Quest', 5, 0)).to.equal(true);
		expect(Aggregates.requiresSnapshotUpdate('Quest', 6, 0)).to.equal(true);
	});

});