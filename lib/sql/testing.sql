
--truncate table pge_streams CASCADE ;

--select pge_initialize();

--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "QuestStarted", "streamType": "Quest", "data": {"location": "Rivendell"}}');
--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "TownReached", "data": {"location": "Moria", "traveled":"5"}}');


--select pge_append_event('{"data":[{"$type":"TownReached","location":"Baerlon","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');
--select pge_append_event('{"data":[{"$type":"TownReached","location":"Caemlyn","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');


--select pge_fetch_latest_aggregate('b5b1e5a7-44b9-4c0b-b5ad-3095c732874e');

DROP SEQUENCE IF EXISTS pge_rolling_buffer_sequence;
CREATE SEQUENCE pge_rolling_buffer_sequence START WITH 0;

DROP TABLE IF EXISTS pge_rolling_buffer CASCADE;
CREATE TABLE pge_rolling_buffer (
	slot				integer CONSTRAINT pk_pge_rolling_buffer PRIMARY KEY,
	message_id			integer NOT NULL,
	timestamp			timestamp without time zone default (now() at time zone 'utc') NOT NULL,
	event_id			UUID NOT NULL,
	stream_id			UUID NOT NULL,
	reference_count		integer NOT NULL	
);


CREATE OR REPLACE FUNCTION pge_seed_rolling_buffer() RETURNS VOID AS $$
DECLARE
	size integer := 100;
	i integer := 0;
	empty UUID := uuid_nil();
	timestamp timestamp := current_timestamp;
BEGIN

	WHILE i < size LOOP
		insert into pge_rolling_buffer 
			(slot, message_id, timestamp, event_id, stream_id, reference_count)
		values
			(i, 0, timestamp, empty, empty, 0);

		i := i + 1;
	END LOOP;


END
$$ LANGUAGE plpgsql;

/* Create index and fill it up */
/*
CREATE UNIQUE CLUSTERED INDEX CIX ON dbo.MyQ (Slot)
WITH (FILLFACTOR = 100)
*/

CREATE OR REPLACE FUNCTION pge_append_rolling_buffer(event UUID, stream UUID) RETURNS integer AS $$
DECLARE
	id int := nextval('pge_rolling_buffer_sequence');
	next int;
BEGIN
	next := id % 100;

	-- need to do this with a row lock hint
	update pge_rolling_buffer
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
            pg_sleep(.100);
			update pge_rolling_buffer
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



select pge_seed_rolling_buffer();

select count(*) from pge_rolling_buffer;

select pge_append_rolling_buffer(uuid_generate_v4(), uuid_generate_v4());
select pge_append_rolling_buffer(uuid_generate_v4(), uuid_generate_v4());
select pge_append_rolling_buffer(uuid_generate_v4(), uuid_generate_v4());
select pge_append_rolling_buffer(uuid_generate_v4(), uuid_generate_v4());
select pge_append_rolling_buffer(uuid_generate_v4(), uuid_generate_v4());


