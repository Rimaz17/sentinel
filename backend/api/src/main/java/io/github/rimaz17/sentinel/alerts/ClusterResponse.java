package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.facilities.Facility;
import java.math.BigDecimal;

/**
 * A cluster as the internal API shows it: where the ring is, what it held this week, and what it
 * would have held at its usual share. Centres are rounded to about 100 m, as report locations are.
 *
 * @param nearestFacilityCode null when the alert's district has no located facility
 * @param nearestFacilityName null with the code
 */
record ClusterResponse(
    BigDecimal latitude,
    BigDecimal longitude,
    int radiusMetres,
    int reportCount,
    int facilityCount,
    BigDecimal expectedCount,
    String nearestFacilityCode,
    String nearestFacilityName) {

  static ClusterResponse from(AlertCluster cluster) {
    Facility nearest = cluster.getNearestFacility();
    return new ClusterResponse(
        cluster.getLatitude(),
        cluster.getLongitude(),
        cluster.getRadiusMetres(),
        cluster.getReportCount(),
        cluster.getFacilityCount(),
        cluster.getExpectedCount(),
        nearest == null ? null : nearest.getCode(),
        nearest == null ? null : nearest.getName());
  }
}
