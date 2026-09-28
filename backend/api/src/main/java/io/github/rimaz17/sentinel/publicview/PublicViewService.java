package io.github.rimaz17.sentinel.publicview;

import io.github.rimaz17.sentinel.alerts.Alert;
import io.github.rimaz17.sentinel.alerts.AlertService;
import io.github.rimaz17.sentinel.alerts.Verdict;
import io.github.rimaz17.sentinel.districts.DistrictService;
import io.github.rimaz17.sentinel.publicview.PublicResponses.Basis;
import io.github.rimaz17.sentinel.publicview.PublicResponses.DistrictStatus;
import io.github.rimaz17.sentinel.publicview.PublicResponses.PublicAlert;
import io.github.rimaz17.sentinel.publicview.PublicResponses.PublicDistrict;
import io.github.rimaz17.sentinel.publicview.PublicResponses.PublicTrends;
import io.github.rimaz17.sentinel.reports.ReportService;
import io.github.rimaz17.sentinel.reports.SymptomGroup;
import io.github.rimaz17.sentinel.reports.WeekCounts;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The public dashboard's view of the data: the pattern, not the individuals. */
@Service
@Transactional(readOnly = true)
class PublicViewService {

  static final ZoneId SRI_LANKA = ZoneId.of("Asia/Colombo");

  /** How far back the public list of alerts reaches: about a season. */
  static final Duration ALERT_HISTORY = Duration.ofDays(90);

  /** The same nine weeks the internal chart shows: the current week and its baseline. */
  static final int TREND_WEEKS = 9;

  private final DistrictService districts;
  private final AlertService alerts;
  private final ReportService reports;

  PublicViewService(DistrictService districts, AlertService alerts, ReportService reports) {
    this.districts = districts;
    this.alerts = alerts;
    this.reports = reports;
  }

  /** Published alerts from the last ninety days: those still going first, then the most recent. */
  List<PublicAlert> alerts() {
    Instant now = alerts.now();
    return alerts.publishedSince(now.minus(ALERT_HISTORY)).stream()
        .map(alert -> toPublic(alert, now))
        .sorted(Comparator.comparing(PublicAlert::active).reversed())
        .toList();
  }

  /** Every district, alphabetically, with the groups it has an active published alert for. */
  List<PublicDistrict> districts() {
    Map<String, List<SymptomGroup>> elevated =
        alerts().stream()
            .filter(PublicAlert::active)
            .collect(
                Collectors.groupingBy(
                    PublicAlert::districtCode,
                    Collectors.mapping(PublicAlert::symptomGroup, Collectors.toList())));
    return districts.activity().stream()
        .map(
            activity -> {
              String code = activity.district().getCode();
              List<SymptomGroup> groups =
                  elevated.getOrDefault(code, List.of()).stream().distinct().sorted().toList();
              return new PublicDistrict(
                  code,
                  activity.district().getName(),
                  activity.district().getProvince(),
                  groups.isEmpty() ? DistrictStatus.USUAL : DistrictStatus.ELEVATED,
                  groups,
                  activity.reportsLast7Days());
            })
        .toList();
  }

  /** Nine weeks of reports per symptom group, for one district or, when null, the country. */
  PublicTrends trends(String districtCode) {
    List<WeekCounts> weeks =
        reports.weeklyCountsToNow(districtCode == null ? null : List.of(districtCode), TREND_WEEKS);
    return new PublicTrends(
        districtCode,
        weeks.get(weeks.size() - 1).end(),
        weeks.stream()
            .map(week -> new PublicTrends.Week(week.start(), week.end(), week.counts()))
            .toList());
  }

  private static PublicAlert toPublic(Alert alert, Instant now) {
    boolean active = alert.isOpenAt(now);
    String districtName = alert.getDistrict().getName();
    return new PublicAlert(
        alert.getDistrict().getCode(),
        districtName,
        alert.getSymptomGroup(),
        active,
        alert.getFirstDetectedAt().atZone(SRI_LANKA).toLocalDate(),
        alert.getLastDetectedAt().atZone(SRI_LANKA).toLocalDate(),
        alert.getVerdict() == Verdict.CONFIRMED ? Basis.CONFIRMED : Basis.THRESHOLD,
        PublicWording.headline(districtName, alert.getSymptomGroup(), active));
  }
}
