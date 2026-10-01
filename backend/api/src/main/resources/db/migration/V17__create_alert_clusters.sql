-- Where an alert's reports are bunched: the geographic check's findings.
--
-- When the detector raises or extends an alert, it looks at that series' located
-- reports from the same seven days for places where they bunch within about
-- 2 km, from several facilities, far beyond that area's usual share of the
-- series (docs/adr/0020-geographic-check.md). Each such place is a row here,
-- drawn on the inspectors' map as a ring. The rows describe the alert's most
-- recent check, and are replaced at every check that extends it.
--
-- The centre is rounded to three decimal places, about 110 m, as report
-- locations are. Internal only: the public API never reads this table.

create table alert_clusters (
    id                  bigint generated always as identity primary key,
    alert_id            bigint not null references alerts (id) on delete cascade,
    latitude            numeric(6, 3) not null,
    longitude           numeric(6, 3) not null,
    -- The ring the counts below were taken in.
    radius_metres       integer not null,
    -- This week's reports in the series within the ring, and the facilities they came from.
    report_count        integer not null,
    facility_count      integer not null,
    -- How many of this week's reports the ring would hold had it kept its share of
    -- the eight baseline weeks.
    expected_count      numeric(8, 2) not null,
    -- The facility with a verified location nearest the centre, in the same district.
    nearest_facility_id bigint references facilities (id),
    constraint alert_clusters_latitude_range check (latitude between 5.8 and 10.0),
    constraint alert_clusters_longitude_range check (longitude between 79.4 and 82.0),
    constraint alert_clusters_radius check (radius_metres > 0),
    constraint alert_clusters_counts check (
        facility_count >= 1 and report_count >= facility_count and expected_count >= 0
    )
);

create index alert_clusters_alert_idx on alert_clusters (alert_id);

-- When the geographic check last looked at the alert's reports: null for an
-- alert raised before the check existed, so "no cluster found" and "never
-- looked" are told apart.
alter table alerts add column clusters_checked_at timestamptz;
