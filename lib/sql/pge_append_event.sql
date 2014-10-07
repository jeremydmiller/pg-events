CREATE OR REPLACE FUNCTION pge_append_event(message json) RETURNS JSON AS $$
	if (plv8.events == null){
		plv8.execute('select pge_initialize()');
	}

	return plv8.events.store(message);
$$ LANGUAGE plv8;