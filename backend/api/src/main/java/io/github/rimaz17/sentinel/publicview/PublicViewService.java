package io.github.rimaz17.sentinel.publicview;

import io.github.rimaz17.sentinel.alerts.Alert;
import io.github.rimaz17.sentinel.alerts.AlertService;
import io.github.rimaz17.sentinel.alerts.Verdict;
import io.github.rimaz17.sentinel.districts.District;
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

  /**
   * Every district, alphabetically, with the groups it has an active published alert for. The last
   * seven days come from the live windows, as the internal district list's do; the usual week is
   * the eight weeks before them, from storage.
   */
  List<PublicDistrict> districts() {
    Map<String, List<SymptomGroup>> elevated =
        alerts().stream()
            .filter(PublicAlert::active)
            .collect(
                Collectors.groupingBy(
                    PublicAlert::districtCode,
                    Collectors.mapping(PublicAlert::symptomGroup, Collectors.toList())));
    List<District> all = districts.all();
    Map<String, Long> lastSevenDays =
        reports.countsLast7Days(all.stream().map(District::getCode).toList());
    Map<String, long[]> weekly = reports.weeklyTotalsByDistrict(TREND_WEEKS);
    return all.stream()
        .map(
            district -> {
              String code = district.getCode();
              List<SymptomGroup> groups =
                  elevated.getOrDefault(code, List.of()).stream().distinct().sorted().toList();
              long current = lastSevenDays.getOrDefault(code, 0L);
              double usual = usualWeek(weekly.getOrDefault(code, new long[TREND_WEEKS]));
              return new PublicDistrict(
                  code,
                  district.getName(),
                  district.getProvince(),
                  groups.isEmpty() ? DistrictStatus.USUAL : DistrictStatus.ELEVATED,
                  groups,
                  current,
                  Math.round(usual * 10) / 10.0,
                  usual > 0 ? (int) Math.round(current * 100 / usual) : null);
            })
        .toList();
  }

  /**
   * The average of the eight weeks before the current one: the same baseline weeks the detector
   * compares against, though without its standard deviation, which the public never sees.
   */
  static double usualWeek(long[] weeks) {
    long sum = 0;
    for (int i = 1; i < weeks.length; i++) {
      sum += weeks[i];
    }
    return (double) sum / (weeks.length - 1);
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
