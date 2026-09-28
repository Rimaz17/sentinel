package io.github.rimaz17.sentinel.districts;

/** A district with its reports over the last seven days and its open alerts. */
public record DistrictActivity(District district, long reportsLast7Days, long openAlerts) {}
