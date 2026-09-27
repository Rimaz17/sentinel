-- Alerts raised by the detector (backend/detector).
--
-- One row per episode: a district and symptom group running more than the
-- threshold's standard deviations above its own eight-week baseline. The detector
-- checks hourly; while a series stays elevated, each check extends the same alert
-- rather than raising a new one. See docs/adr/0007-detection-v1.md.
--
-- The figures describe the most recent check. Status is the inspectors' to change;
-- the detector only ever creates alerts as NEW.

create sequence alert_number_seq start with 1001;

create table alerts (
    id                bigint generated always as identity primary key,
    code              text not null unique default ('A-' || nextval('alert_number_seq')),
    district_code     text not null references districts (code),
    symptom_group     text not null,
    status            text not null default 'NEW',
    first_detected_at timestamptz not null,
    last_detected_at  timestamptz not null,
    observed_count    integer not null,
    baseline_mean     numeric(8, 2) not null,
    baseline_sd       numeric(8, 2) not null,
    z_score           numeric(9, 2) not null,
    peak_z_score      numeric(9, 2) not null,
    threshold         numeric(4, 2) not null,
    constraint alerts_symptom_group check (
        symptom_group in ('DENGUE_LIKE', 'INFLUENZA_LIKE', 'GASTROINTESTINAL', 'LEPTOSPIROSIS_LIKE')
    ),
    constraint alerts_status check (status in ('NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'CLOSED')),
    constraint alerts_detection_order check (last_detected_at >= first_detected_at),
    constraint alerts_counts check (observed_count >= 0 and baseline_mean >= 0 and baseline_sd > 0),
    constraint alerts_peak check (peak_z_score >= z_score)
);

create index alerts_series_idx on alerts (district_code, symptom_group, last_detected_at desc);
