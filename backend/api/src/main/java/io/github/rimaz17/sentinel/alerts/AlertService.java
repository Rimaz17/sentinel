package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.web.ApiProblem;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Limit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AlertService {

  static final String NO_SUCH_ALERT = "No alert has this code.";
  static final String FORWARD_ONLY =
      "An alert only moves forward: new, acknowledged, investigating, closed.";
  static final String ALREADY_JUDGED = "This alert already has a verdict, and a verdict is final.";
  static final String CLOSED_TAKES_NO_VERDICT = "A closed alert takes no verdict.";
  static final String CHANGED =
      "Someone else changed this alert a moment ago. Reload it and try again.";

  private final AlertRepository alerts;
  private final Clock clock;
  private final BigDecimal publicThreshold;

  AlertService(
      AlertRepository alerts,
      Clock clock,
      @Value("${sentinel.alerts.public-threshold:5.0}") BigDecimal publicThreshold) {
    this.alerts = alerts;
    this.clock = clock;
    this.publicThreshold = publicThreshold;
  }

  /**
   * How far above baseline, in standard deviations, an alert no inspector has judged must peak to
   * be published anyway. See docs/adr/0013-public-alerts.md.
   */
  public BigDecimal publicThreshold() {
    return publicThreshold;
  }

  public Alert find(String code) {
    return alerts
        .findByCode(code)
        .orElseThrow(() -> new ApiProblem(HttpStatus.NOT_FOUND, NO_SUCH_ALERT));
  }

  /** Moves an alert on through its investigation. It never moves back. */
  @Transactional
  public Alert moveTo(String code, AlertStatus target) {
    Alert alert = find(code);
    if (target.ordinal() <= alert.getStatus().ordinal()) {
      throw new ApiProblem(HttpStatus.CONFLICT, FORWARD_ONLY);
    }
    if (alerts.moveStatus(code, alert.getStatus().name(), target.name()) == 0) {
      throw new ApiProblem(HttpStatus.CONFLICT, CHANGED);
    }
    return find(code);
  }

  /**
   * Records an inspector's verdict. A false alarm closes the alert; a confirmation publishes it.
   */
  @Transactional
  public Alert judge(String code, Verdict verdict, long accountId) {
    Alert alert = find(code);
    if (alert.getVerdict() != null) {
      throw new ApiProblem(HttpStatus.CONFLICT, ALREADY_JUDGED);
    }
    if (alert.getStatus() == AlertStatus.CLOSED) {
      throw new ApiProblem(HttpStatus.CONFLICT, CLOSED_TAKES_NO_VERDICT);
    }
    if (alerts.recordVerdict(code, verdict.name(), clock.instant(), accountId) == 0) {
      throw new ApiProblem(HttpStatus.CONFLICT, CHANGED);
    }
    return find(code);
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

  /**
   * The alerts the public may see that were last detected since {@code since}, most recent first:
   * confirmed by an inspector, or unjudged and above the public threshold.
   */
  public List<Alert> publishedSince(Instant since) {
    return alerts
        .findByLastDetectedAtGreaterThanEqualOrderByLastDetectedAtDescIdDesc(since)
        .stream()
        .filter(alert -> alert.isPublic(publicThreshold))
        .toList();
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
