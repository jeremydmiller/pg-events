DROP TABLE IF EXISTS pge_projections_$NAME$ CASCADE;
CREATE TABLE pge_projections_$NAME$ (
	id			uuid CONSTRAINT pk_pge_projections_$NAME$ PRIMARY KEY,
	data		json NOT NULL
);