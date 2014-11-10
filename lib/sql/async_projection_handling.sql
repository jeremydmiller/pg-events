
CREATE OR REPLACE FUNCTION pge_process_queued_event(event JSON, type varchar, id UUID) RETURNS VOID AS $$
	if (plv8.projector == null){
		plv8.execute('select pge_initialize()');
	}

	// TODO: throw if event is null, or event.$type is null

	var plan = plv8.projector.library.delayedPlanFor(event.$type);

	plan.execute(plv8.store, {id: id, type: type}, event);
$$ LANGUAGE plv8;

CREATE OR REPLACE FUNCTION pge_mark_processed(slot_id int) RETURNS VOID AS $$
BEGIN
	UPDATE pge_rolling_buffer 
	SET 
		reference_count = 0, 
		message_id = 0
	WHERE 
		slot = slot_id;
END
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION pge_process_async_projections() RETURNS int AS $$
DECLARE
  last_slot int := 0;
  events RECORD;
BEGIN


  FOR events IN SELECT * FROM pge_queued_projection_events_vw LIMIT 25 LOOP
  	last_slot := events.slot;

  	-- TODO: add some error handling somehow

  	perform pge_process_queued_event(events.data, events.stream_type, events.stream_id);
  	perform pge_mark_processed(events.slot);


  END LOOP;

  return last_slot;
END
$$ LANGUAGE plpgsql;