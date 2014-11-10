





CREATE OR REPLACE FUNCTION pge_process_queued_event() RETURNS JSON AS $$
	if (plv8.projector == null){
		plv8.execute('select pge_initialize()');
	}

	var data = plv8.execute('select pge_pop_rolling_buffer()')[0].pge_pop_rolling_buffer;

	if (data.event == null) return {id: null};

	var plan = plv8.projector.library.delayedPlanFor(data.event.$type);

	plan.execute(plv8.store, data.stream, data.event);

	return {id: data.event.$id};
$$ LANGUAGE plv8;

