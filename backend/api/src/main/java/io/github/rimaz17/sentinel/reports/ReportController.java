package io.github.rimaz17.sentinel.reports;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recent reports, with their approximate locations. This is internal data: it will be restricted to
 * inspectors, scoped to their districts, when sign-in arrives, and it is never part of the public
 * API.
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

  @GetMapping
  List<ReportResponse> recent(
      @RequestParam(defaultValue = "50") @Min(1) @Max(500) int limit,
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    List<Report> found =
        district == null ? reports.recent(limit) : reports.recentInDistrict(district, limit);
    return found.stream().map(ReportResponse::from).toList();
  }

  /**
   * Reports per symptom group in each of the last nine weeks, up to now: the current week and the
   * eight a detection check compares it against. Without a district, the whole country.
   */
  @GetMapping("/weekly-counts")
  WeeklyCountsResponse weeklyCounts(
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    return WeeklyCountsResponse.from(district, reports.weeklyCountsToNow(district, CHART_WEEKS));
  }
}
