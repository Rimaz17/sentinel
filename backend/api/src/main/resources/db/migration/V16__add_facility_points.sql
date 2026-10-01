-- Each facility with a verified location as a geographic point, so the
-- facility nearest to a cluster of reports can be found by distance. Generated
-- from the registry's own coordinates, and null where the registry has none
-- (docs/adr/0006-facility-locations-verified-before-use.md).

alter table facilities
    add column location geography(Point, 4326)
        generated always as (
            case when latitude is not null
                then st_setsrid(st_makepoint(longitude::float8, latitude::float8), 4326)::geography
            end
        ) stored;

create index facilities_location_idx on facilities using gist (location);
