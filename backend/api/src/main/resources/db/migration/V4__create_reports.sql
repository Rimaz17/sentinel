-- Anonymised symptom reports.
--
-- Nothing here identifies a patient. Identity fields are discarded at ingestion,
-- before anything is stored or logged; age survives only as a ten-year band and
-- location only to three decimal places, about 110 m. The column types enforce
-- the same rounding, so a value with more precision is rounded by the database
-- even if it ever arrived unrounded.
--
-- The district is copied from the facility when the report arrives, so a later
-- correction to the registry does not move a report's history.

create table reports (
    id            uuid primary key,
    facility_id   bigint not null references facilities (id),
    district_code text not null references districts (code),
    symptom_group text not null,
    age_band      text not null,
    latitude      numeric(6, 3),
    longitude     numeric(6, 3),
    reported_at   timestamptz not null,
    received_at   timestamptz not null,
    constraint reports_symptom_group check (
        symptom_group in ('DENGUE_LIKE', 'INFLUENZA_LIKE', 'GASTROINTESTINAL', 'LEPTOSPIROSIS_LIKE')
    ),
    constraint reports_age_band check (
        age_band in ('0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90+')
    ),
    constraint reports_location_pair check ((latitude is null) = (longitude is null)),
    constraint reports_latitude_range check (latitude between 5.8 and 10.0),
    constraint reports_longitude_range check (longitude between 79.4 and 82.0)
);

create index reports_reported_at_idx on reports (reported_at desc);
create index reports_district_reported_at_idx on reports (district_code, reported_at desc);
