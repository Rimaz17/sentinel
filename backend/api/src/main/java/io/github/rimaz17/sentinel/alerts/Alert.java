package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.districts.District;
import io.github.rimaz17.sentinel.reports.SymptomGroup;
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
import java.time.Duration;
import java.time.Instant;
import org.hibernate.annotations.Immutable;

/**
 * An alert episode raised by the detector: a district and symptom group running above its own
 * eight-week baseline. The detector writes these rows; the API only reads them. Its figures
 * describe the most recent check that found the series above threshold. See
 * docs/adr/0007-detection-v1.md.
 */
@Entity
@Immutable
@Table(name = "alerts")
public class Alert {

  /**
   * How long after its last detection an alert can still be extended by the next one. It is the
   * detector's episode rule (EPISODE_GAP in backend/detector/sentinel_detector/episodes.py): a
   * detection within this gap continues the alert, and after it a detection raises a new one.
   */
  public static final Duration EPISODE_GAP = Duration.ofHours(24);

  @Id private Long id;

  @Column(nullable = false, unique = true)
  private String code;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "district_code", nullable = false)
  private District district;

  @Enumerated(EnumType.STRING)
  @Column(name = "symptom_group", nullable = false)
  private SymptomGroup symptomGroup;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AlertStatus status;

  @Column(name = "first_detected_at", nullable = false)
  private Instant firstDetectedAt;

  @Column(name = "last_detected_at", nullable = false)
  private Instant lastDetectedAt;

  @Column(name = "observed_count", nullable = false)
  private int observedCount;

  @Column(name = "baseline_mean", nullable = false)
  private BigDecimal baselineMean;

  @Column(name = "baseline_sd", nullable = false)
  private BigDecimal baselineSd;

  @Column(name = "z_score", nullable = false)
  private BigDecimal zScore;

  @Column(name = "peak_z_score", nullable = false)
  private BigDecimal peakZScore;

  @Column(nullable = false)
  private BigDecimal threshold;

  protected Alert() {}

  /**
   * Whether the episode is still open at {@code now}: not closed by an inspector, and recent enough
   * that the detector's next finding for this series would extend it rather than raise a new alert.
   */
  public boolean isOpenAt(Instant now) {
    return status != AlertStatus.CLOSED && !lastDetectedAt.plus(EPISODE_GAP).isBefore(now);
  }

  public String getCode() {
    return code;
  }

  public District getDistrict() {
    return district;
  }

  public SymptomGroup getSymptomGroup() {
    return symptomGroup;
  }

  public AlertStatus getStatus() {
    return status;
  }

  public Instant getFirstDetectedAt() {
    return firstDetectedAt;
  }

  public Instant getLastDetectedAt() {
    return lastDetectedAt;
  }

  public int getObservedCount() {
    return observedCount;
  }

  public BigDecimal getBaselineMean() {
    return baselineMean;
  }

  public BigDecimal getBaselineSd() {
    return baselineSd;
  }

  public BigDecimal getZScore() {
    return zScore;
  }

  public BigDecimal getPeakZScore() {
    return peakZScore;
  }

  public BigDecimal getThreshold() {
    return threshold;
  }
}
