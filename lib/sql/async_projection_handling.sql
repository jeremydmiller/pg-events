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


CREATE OR REPLACE FUNCTION pge_process_async_projections_result(processed int, highest int) RETURNS JSON AS $$
	return {processed: processed, highest: highest};
$$ LANGUAGE plv8;

CREATE OR REPLACE FUNCTION pge_process_async_projections() RETURNS JSON AS $$
DECLARE
  last_slot int := 0;
  events RECORD;
  last int;
  result JSON;
BEGIN


  FOR events IN SELECT * FROM pge_queued_projection_events_vw LIMIT 25 LOOP
  	last_slot := events.slot;

  	-- TODO: add some error handling somehow

  	perform pge_process_queued_event(events.data, events.stream_type, events.stream_id);
  	perform pge_mark_processed(events.slot);

  	
  END LOOP;

  select max(message_id) into last from pge_rolling_buffer;

  select pge_process_async_projections_result(last_slot, last) into result;

  return result;
END
$$ LANGUAGE plpgsql;

