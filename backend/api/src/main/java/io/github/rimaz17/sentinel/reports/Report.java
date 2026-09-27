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
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Persistable;

/**
 * A stored, anonymised report. Its id is assigned at ingestion, so it is persisted as new rather
 * than merged; reports are never updated.
 */
@Entity
@Table(name = "reports")
public class Report implements Persistable<UUID> {

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

  @Transient private boolean isNew = true;

  protected Report() {}

  Report(AnonymisedReport report, Facility facility) {
    this.id = report.id();
    this.facility = facility;
    this.districtCode = report.districtCode();
    this.symptomGroup = report.symptomGroup();
    this.ageBand = report.ageBand();
    this.latitude = report.latitude();
    this.longitude = report.longitude();
    this.reportedAt = report.reportedAt();
    this.receivedAt = report.receivedAt();
  }

  @Override
  public UUID getId() {
    return id;
  }

  @Override
  public boolean isNew() {
    return isNew;
  }

  @PostLoad
  @PostPersist
  void markStored() {
    isNew = false;
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
