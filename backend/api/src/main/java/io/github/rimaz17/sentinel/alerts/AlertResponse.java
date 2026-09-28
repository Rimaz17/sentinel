package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.reports.SymptomGroup;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * An alert as the internal API shows it, in the technical wording inspectors use. This is never
 * part of the public API: public alerts are published separately, in plain wording, once an
 * inspector confirms one (Phase 4).
 */
record AlertResponse(
    String code,
    String districtCode,
    String districtName,
    SymptomGroup symptomGroup,
    AlertStatus status,
    boolean open,
    Instant firstDetectedAt,
    Instant lastDetectedAt,
    int observedCount,
    BigDecimal baselineMean,
    BigDecimal baselineSd,
    BigDecimal zScore,
    BigDecimal peakZScore,
    BigDecimal threshold) {

  static AlertResponse from(Alert alert, Instant now) {
    return new AlertResponse(
        alert.getCode(),
        alert.getDistrict().getCode(),
        alert.getDistrict().getName(),
        alert.getSymptomGroup(),
        alert.getStatus(),
        alert.isOpenAt(now),
        alert.getFirstDetectedAt(),
        alert.getLastDetectedAt(),
        alert.getObservedCount(),
        alert.getBaselineMean(),
        alert.getBaselineSd(),
        alert.getZScore(),
        alert.getPeakZScore(),
        alert.getThreshold());
  }
}
