package io.github.rimaz17.sentinel.reports;

import io.github.rimaz17.sentinel.auth.Caller;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recent reports, with their approximate locations. Internal data: inspectors only, within their
 * districts, and never part of the public API. Without a district, a request covers every district
 * the caller may see.
 */
@RestController
@RequestMapping("/api/reports")
class ReportController {

  private final ReportService reports;

  ReportController(ReportService reports) {
    this.reports = reports;
  }

  /** The detector's comparison: the current week and the eight baseline weeks before it. */
  static final int CHART_WEEKS = 9;

  /**
   * The most report positions one map request returns. A normal week is about 1,100 across the
   * country, so this leaves room for several weeks or a large outbreak.
   */
  static final int MAP_LIMIT = 5000;

  @GetMapping
  List<ReportResponse> recent(
      Caller caller,
      @RequestParam(defaultValue = "50") @Min(1) @Max(500) int limit,
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    return reports.recent(caller.districtsFor(district), limit).stream()
        .map(ReportResponse::from)
        .toList();
  }

  /**
   * Reports with a location from the last {@code days} days, newest first, for the map's report
   * dots. Reports without a location are left out; at most {@link #MAP_LIMIT} are returned.
   */
  @GetMapping("/locations")
  List<ReportResponse> located(
      Caller caller,
      @RequestParam(defaultValue = "7") @Min(1) @Max(63) int days,
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    return reports.locatedWithin(caller.districtsFor(district), days, MAP_LIMIT).stream()
        .map(ReportResponse::from)
        .toList();
  }

  /**
   * Reports per symptom group in each of the last nine weeks, up to now: the current week and the
   * eight a detection check compares it against. Without a district, every district the caller
   * covers, which for a national inspector is the whole country.
   */
  @GetMapping("/weekly-counts")
  WeeklyCountsResponse weeklyCounts(
      Caller caller,
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    return WeeklyCountsResponse.from(
        district, reports.weeklyCountsToNow(caller.districtsFor(district), CHART_WEEKS));
  }
}
