package io.github.rimaz17.sentinel.reports;

import io.github.rimaz17.sentinel.facilities.Facility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/**
 * A stored, anonymised report, as the queries read it. Reports are written only by {@link
 * ReportService#record}, with an id assigned at ingestion, and never updated.
 */
@Entity
@Immutable
@Table(name = "reports")
public class Report {

  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "facility_id", nullable = false)
  private Facility facility;

  @Column(name = "district_code", nullable = false)
  private String districtCode;

  @Enumerated(EnumType.STRING)
  @Column(name = "symptom_group", nullable = false)
  private SymptomGroup symptomGroup;

  @Column(name = "age_band", nullable = false)
  private AgeBand ageBand;

  private BigDecimal latitude;

  private BigDecimal longitude;

  @Column(name = "reported_at", nullable = false)
  private Instant reportedAt;

  @Column(name = "received_at", nullable = false)
  private Instant receivedAt;

  protected Report() {}

  public UUID getId() {
    return id;
  }

  public Facility getFacility() {
    return facility;
  }

  public String getDistrictCode() {
    return districtCode;
  }

  public SymptomGroup getSymptomGroup() {
    return symptomGroup;
  }

  public AgeBand getAgeBand() {
    return ageBand;
  }

  public BigDecimal getLatitude() {
    return latitude;
  }

  public BigDecimal getLongitude() {
    return longitude;
  }

  public Instant getReportedAt() {
    return reportedAt;
  }

  public Instant getReceivedAt() {
    return receivedAt;
  }
}
