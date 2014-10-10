
DROP SEQUENCE IF EXISTS pge_rolling_buffer_sequence;
CREATE SEQUENCE pge_rolling_buffer_sequence START WITH 1;

DROP SEQUENCE IF EXISTS pge_rolling_buffer_dequeue_sequence;
CREATE SEQUENCE pge_rolling_buffer_dequeue_sequence START WITH 1;

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
	size integer := $SIZE$;
	i integer := 0;
	empty UUID := uuid_nil();
	timestamp timestamp := current_timestamp;
	current integer;
BEGIN
	WHILE i < $SIZE$ LOOP
		insert into pge_rolling_buffer 
			(slot, message_id, timestamp, event_id, stream_id, reference_count)
		values
			(i, 0, timestamp, empty, empty, 0);

		i := i + 1;
	END LOOP;


END
$$ LANGUAGE plpgsql;

select pge_seed_rolling_buffer();


CREATE OR REPLACE FUNCTION pge_append_rolling_buffer(event UUID, stream UUID) RETURNS integer AS $$
DECLARE
	id int := nextval('pge_rolling_buffer_sequence');
	next int;
BEGIN
	next := id % $SIZE$;

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
            select pg_sleep(.100);
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





