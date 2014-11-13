var PostgresService = require('./pg-service');

module.exports = function(db){
	var service = new PostgresService({

	}, db);

	service.findFunctionResult('pop', 'pge_pop_rolling_buffer');
	service.findFunctionResult('status', 'pge_rolling_buffer_status');

	service.queuedCount = function(){
		return this.db.query('SELECT count(*) as count from pge_rolling_buffer where reference_count = 1')
			.then(function(result){
				return parseInt(result.rows[0].count);
			});

	}

	service.queuedEvents = function(){
		return this.db.query('select event_id as event, stream_id as stream from pge_rolling_buffer where reference_count = 1')
			.then(function(result){
				return result.rows;
			});
	}

	service.processQueuedEvent = function(){
		return this.db.query('select pge_process_queued_event()');
	}

	return service;
}
