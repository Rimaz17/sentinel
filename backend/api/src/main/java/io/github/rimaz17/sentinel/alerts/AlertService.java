package io.github.rimaz17.sentinel.alerts;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AlertService {

  private final AlertRepository alerts;
  private final Clock clock;

  AlertService(AlertRepository alerts, Clock clock) {
    this.alerts = alerts;
    this.clock = clock;
  }

  /**
   * The most recently detected first, so an alert still being extended stays at the top. Only the
   * given districts, or every district when {@code districtCodes} is null.
   */
  public List<Alert> recent(List<String> districtCodes, int limit) {
    if (districtCodes == null) {
      return alerts.findAllByOrderByLastDetectedAtDescIdDesc(Limit.of(limit));
    }
    if (districtCodes.isEmpty()) {
      return List.of();
    }
    return alerts.findByDistrictCodeInOrderByLastDetectedAtDescIdDesc(
        districtCodes, Limit.of(limit));
  }

  /** How many alerts are open in each district right now. Districts with none are absent. */
  public Map<String, Long> openCountsByDistrict() {
    return alerts.countOpenByDistrict(now().minus(Alert.EPISODE_GAP)).stream()
        .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
  }

  public Instant now() {
    return clock.instant();
  }
}
