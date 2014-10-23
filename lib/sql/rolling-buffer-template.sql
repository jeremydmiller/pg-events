LISTEN pge_event_queued;

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


        NOTIFY pge_event_queued;
		--select pg_notify('pge-event-queued');

	RETURN id;
END
$$ LANGUAGE plpgsql;





CREATE OR REPLACE FUNCTION pge_bundle_dequeue_message(event JSON, stream UUID, type varchar(100)) RETURNS JSON AS $$
	return {event: event, stream: {id: stream, type: type}};
$$ LANGUAGE plv8;

CREATE OR REPLACE FUNCTION pge_pop_rolling_buffer() RETURNS JSON as $$
DECLARE
	val int := nextval('pge_rolling_buffer_dequeue_sequence');
	next int;
	eventId UUID;
	streamId UUID;
	type varchar(100);
	event JSON;
BEGIN
	next := val % $SIZE$;

	select 
		event_id, stream_id into eventId, streamId 
	from 
		pge_rolling_buffer
	where 
		slot = next AND
		reference_count = 1
	FOR SHARE;

	IF NOT FOUND THEN
		select pg_sleep(.100);

		select 
			event_id, stream_id into eventId, streamId 
		from 
			pge_rolling_buffer
		where 
			slot = next AND
			reference_count = 1
		FOR SHARE;
	END IF; 

	-- TODO - do something if this is null

	update pge_rolling_buffer set reference_count = 0, message_id = 0
		where slot = next;



	select pge_streams.type into type from pge_streams where pge_streams.id = streamId;

	select pge_events.data into event from pge_events where pge_events.id = eventId;

	return pge_bundle_dequeue_message(event, streamId, type);
END
$$ LANGUAGE plpgsql;


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

