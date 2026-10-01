package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.facilities.Facility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import org.hibernate.annotations.Immutable;

/**
 * A place where an alert's reports are bunched, as the detector's geographic check found it: a ring
 * around a centre, this week's reports and facilities within it, and how many it would have held at
 * its usual share (docs/adr/0020-geographic-check.md). Written only by the detector, which replaces
 * an alert's clusters at every check that extends it. Internal data: never part of the public API.
 */
@Entity
@Immutable
@Table(name = "alert_clusters")
public class AlertCluster {

  @Id private Long id;

  @Column(name = "alert_id", nullable = false)
  private Long alertId;

  @Column(nullable = false)
  private BigDecimal latitude;

  @Column(nullable = false)
  private BigDecimal longitude;

  @Column(name = "radius_metres", nullable = false)
  private int radiusMetres;

  @Column(name = "report_count", nullable = false)
  private int reportCount;

  @Column(name = "facility_count", nullable = false)
  private int facilityCount;

  @Column(name = "expected_count", nullable = false)
  private BigDecimal expectedCount;

  /** The located facility nearest the centre, in the alert's district; null if it has none. */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nearest_facility_id")
  private Facility nearestFacility;

  protected AlertCluster() {}

  public Long getAlertId() {
    return alertId;
  }

  public BigDecimal getLatitude() {
    return latitude;
  }

  public BigDecimal getLongitude() {
    return longitude;
  }

  public int getRadiusMetres() {
    return radiusMetres;
  }

  public int getReportCount() {
    return reportCount;
  }

  public int getFacilityCount() {
    return facilityCount;
  }

  public BigDecimal getExpectedCount() {
    return expectedCount;
  }

  public Facility getNearestFacility() {
    return nearestFacility;
  }
}
