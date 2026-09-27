-- The facility registry: every institution allowed to submit reports.
--
-- Seeded from the Ministry of Health institution list (see
-- scripts/facility-registry/README.md). The code is the ministry's own Health
-- Institution Number, so a facility keeps one identifier across systems.
--
-- A location is present only where the source coordinates passed verification.
-- Many source records were geocoded to a fallback point, often in another
-- district, and an unverified location is worse than none.

create table facilities (
    id               bigint generated always as identity primary key,
    code             text not null unique,
    name             text not null,
    district_code    text not null references districts (code),
    category         text not null,
    institution_type text not null,
    latitude         numeric(9, 6),
    longitude        numeric(9, 6),
    constraint facilities_code_format check (code ~ '^[A-Z]{3}[0-9]{7}$'),
    constraint facilities_category check (category in ('HOSPITAL', 'MOH_OFFICE')),
    constraint facilities_location_pair check ((latitude is null) = (longitude is null)),
    constraint facilities_latitude_range check (latitude between 5.8 and 10.0),
    constraint facilities_longitude_range check (longitude between 79.4 and 82.0)
);

create index facilities_district_code_idx on facilities (district_code);
