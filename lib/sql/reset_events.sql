	delete from pge_rolling_buffer;
	ALTER SEQUENCE pge_rolling_buffer_sequence RESTART WITH 1;
	ALTER SEQUENCE pge_rolling_buffer_dequeue_sequence RESTART WITH 1;
	select pge_seed_rolling_buffer();
	select pge_clean_all_events();