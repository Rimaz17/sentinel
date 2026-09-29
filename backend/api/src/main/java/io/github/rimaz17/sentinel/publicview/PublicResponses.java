package io.github.rimaz17.sentinel.publicview;

import io.github.rimaz17.sentinel.reports.SymptomGroup;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * What the public API returns, and all it returns. Every public endpoint is assumed to be scraped,
 * so none of these records has a field for a report's position, a facility, an alert's internal
 * code or figures, an inspector, or anything about how the system is running.
 */
final class PublicResponses {

  private PublicResponses() {}

  enum DistrictStatus {
    /** No published alert is active. */
    USUAL,
    /** At least one published alert is active. */
    ELEVATED
  }

  /**
   * A district's status today.
   *
   * @param elevatedGroups the symptom groups with an active published alert
   * @param reportsLast7Days reports from the district's facilities over the last seven days
   * @param usualWeek the average of the eight weeks before, the district's own usual week
   * @param percentOfUsual the last seven days as a percentage of the usual week, rounded; null when
   *     the district has no usual week to compare with. Deliberately a neutral figure: whether a
   *     rise is worth telling the public about is decided by published alerts alone.
   */
  record PublicDistrict(
      String code,
      String name,
      String province,
      DistrictStatus status,
      List<SymptomGroup> elevatedGroups,
      long reportsLast7Days,
      double usualWeek,
      Integer percentOfUsual) {}

  /**
   * Weekly reports per symptom group, for one district or the whole country.
   *
   * @param districtCode null for the whole country
   */
  record PublicTrends(String districtCode, Instant asOf, List<Week> weeks) {

    record Week(Instant start, Instant end, Map<SymptomGroup, Long> counts) {}
  }

  enum Basis {
    /** A public health inspector confirmed the rise. */
    CONFIRMED,
    /** No inspector had judged it yet, and the rise was large enough to publish on its own. */
    THRESHOLD
  }

  /**
   * A published alert. Dates only, in Sri Lanka, so the detector's hourly timing is not exposed.
   *
   * @param active whether the rise is still going on
   * @param since the day it was first flagged
   * @param lastElevated the most recent day it was still flagged
   */
  record PublicAlert(
      String districtCode,
      String districtName,
      SymptomGroup symptomGroup,
      boolean active,
      LocalDate since,
      LocalDate lastElevated,
      Basis basis,
      String headline) {}
}
