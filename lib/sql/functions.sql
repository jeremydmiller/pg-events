CREATE OR REPLACE FUNCTION pge_clean_all_events() RETURNS VOID AS $$
	if (plv8.cleanAll == null){
		plv8.execute('select pge_initialize()');
	}

	return plv8.store.cleanAll();
$$ LANGUAGE plv8;

CREATE OR REPLACE FUNCTION pge_fetch_stream(id UUID) RETURNS JSON AS $$
	var raw = plv8.execute('select * from pge_streams where id = $1', [id]);

	if (raw.length == 0){
		return null;
	}

	var stream = {
		id: raw[0].id,
		type: raw[0].type,
		version: raw[0].version,
		events: []
	};

	var rows = plv8.execute('select data from pge_events where stream_id = $1 order by version', [id]);
	for (var i = 0; i < rows.length; i++){
		stream.events.push(rows[i].data);
	}


	return stream;
$$ LANGUAGE plv8;


CREATE OR REPLACE FUNCTION pge_find_view(id UUID, type varchar(100)) RETURNS JSON AS $$
	if (plv8.store == null){
		plv8.execute('select pge_initialize()');
	}

	try {
		return plv8.store.findView(type, id);
	}
	catch (e){
		throw new Error("Failed while trying to find view '" + type + "' with id: " + id + " --> " + e);
	}
	
$$ LANGUAGE plv8;



CREATE OR REPLACE FUNCTION pge_find_aggregate_view(view_name varchar(100)) RETURNS JSON AS $$
DECLARE
	view JSON;
BEGIN
	SELECT data into view FROM pge_aggregates WHERE name = view_name;

	return view;
END
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION pge_fetch_latest_aggregate(id UUID) RETURNS JSON AS $$
	if (plv8.events == null){
		plv8.execute('select pge_initialize()');
	}

	try {
		return plv8.events.buildAggregate(id);
	}
	catch (e){
		throw new Error('Error fetching the latest aggregate for ' + id + ' --> ' + e);
	}
$$ LANGUAGE plv8;

CREATE OR REPLACE FUNCTION pge_rebuild_naive() RETURNS JSON AS $$
	if (plv8.events == null){
		plv8.execute('select pge_initialize()');
	}

	return plv8.events.replayAllEvents();
$$ LANGUAGE plv8;


CREATE OR REPLACE FUNCTION pge_apply_projection(name VARCHAR(100), state JSON, evt JSON) RETURNS JSON AS $$
	if (plv8.events == null){
		plv8.execute('select pge_initialize()');
	}

	var projection = plv8.projector.findProjection(name);

	if (projection == null){
		throw new Error("No projection matches the name '" + name + "'");
	}

	return projection.applyEvent(state, evt);
$$ LANGUAGE plv8;


