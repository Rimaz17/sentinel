-- Each located report as a geographic point, for distance queries.
--
-- Generated from the stored latitude and longitude, so it can never disagree
-- with them, carries the same rounding to about 100 m, and needs nothing from
-- the stream processor that writes reports. Null for a report without a
-- location. The index serves "reports within 2 km of here".

alter table reports
    add column location geography(Point, 4326)
        generated always as (
            case when latitude is not null
                then st_setsrid(st_makepoint(longitude::float8, latitude::float8), 4326)::geography
            end
        ) stored;

create index reports_location_idx on reports using gist (location);
