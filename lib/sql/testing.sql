
truncate table pge_streams CASCADE ;

--select pge_initialize();

--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "QuestStarted", "streamType": "Quest", "data": {"location": "Rivendell"}}');
--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "TownReached", "data": {"location": "Moria", "traveled":"5"}}');


--select pge_append_event('{"data":[{"$type":"TownReached","location":"Baerlon","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');
--select pge_append_event('{"data":[{"$type":"TownReached","location":"Caemlyn","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');


--select pge_fetch_latest_aggregate('b5b1e5a7-44b9-4c0b-b5ad-3095c732874e');


CREATE OR REPLACE FUNCTION pge_undefined_append_rolling_buffer(event UUID, stream UUID) RETURNS integer AS $$
DECLARE
	id int := nextval('pge_undefined_rolling_buffer_sequence');
	next int;
BEGIN
	next := id % 200;

	update pge_undefined_rolling_buffer
		SET
			timestamp = current_timestamp,
			message_id = id,
			event_id = event,
			stream_id = stream,
			reference_count = reference_count + 1
		WHERE
			slot = next;

		-- Try again if it's filled up
        IF NOT found THEN
            select pg_sleep(.100);
			update pge_undefined_rolling_buffer
				SET
					timestamp = current_timestamp,
					message_id = id,
					event_id = event,
					stream_id = stream,
					reference_count = reference_count + 1
				WHERE
					slot = next AND reference_count = 0;
		        END IF;

	RETURN id;
END
$$ LANGUAGE plpgsql;
select * from pge_streams;