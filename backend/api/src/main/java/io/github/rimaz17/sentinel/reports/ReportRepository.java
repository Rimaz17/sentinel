package io.github.rimaz17.sentinel.reports;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface ReportRepository extends JpaRepository<Report, UUID> {

  /**
   * Stores a report unless one with its id is already stored, and returns the number of rows
   * written: 1, or 0 for a report seen before. Kafka can deliver a message more than once, and the
   * id assigned at ingestion makes the second delivery harmless.
   */
  @Modifying
  @Query(
      nativeQuery = true,
      value =
          """
          insert into reports (id, facility_id, district_code, symptom_group, age_band, latitude,
                               longitude, reported_at, received_at, stored_at)
          values (:id, :facilityId, :districtCode, :symptomGroup, :ageBand, :latitude,
                  :longitude, :reportedAt, :receivedAt, :storedAt)
          on conflict (id) do nothing
          """)
  int insertIfAbsent(
      UUID id,
      long facilityId,
      String districtCode,
      String symptomGroup,
      String ageBand,
      BigDecimal latitude,
      BigDecimal longitude,
      Instant reportedAt,
      Instant receivedAt,
      Instant storedAt);

  @EntityGraph(attributePaths = "facility")
  List<Report> findAllByOrderByReportedAtDescIdDesc(Limit limit);

  @EntityGraph(attributePaths = "facility")
  List<Report> findByDistrictCodeInOrderByReportedAtDescIdDesc(
      Collection<String> districtCodes, Limit limit);

  /** Reports with a location that presented in [from, to), newest first, for the map. */
  @Query(
      """
      select r from Report r join fetch r.facility
      where r.latitude is not null
        and r.reportedAt >= :from and r.reportedAt < :to
      order by r.reportedAt desc, r.id desc
      """)
  List<Report> findLocated(Instant from, Instant to, Limit limit);

  /** As {@link #findLocated}, in the given districts only. */
  @Query(
      """
      select r from Report r join fetch r.facility
      where r.latitude is not null
        and r.reportedAt >= :from and r.reportedAt < :to
        and r.districtCode in :districtCodes
      order by r.reportedAt desc, r.id desc
      """)
  List<Report> findLocatedIn(
      Instant from, Instant to, Collection<String> districtCodes, Limit limit);

  /** Every report that presented at or after {@code since}, as the seven-day windows hold it. */
  @Query(
      """
      select new io.github.rimaz17.sentinel.reports.WindowEntry(
          r.id, r.districtCode, r.symptomGroup, r.reportedAt)
      from Report r
      where r.reportedAt >= :since
      """)
  List<WindowEntry> findWindowEntriesSince(Instant since);

  /**
   * Reports per symptom group and week in [start, end), as {@code [symptomGroup, weeksAgo, count]}.
   * Week 0 is [end - 7 days, end), week 1 the seven days before it, and so on: the detector's own
   * bucketing (backend/detector/sentinel_detector/store.py). {@code districtCodes} is a
   * comma-separated list of the districts to count, or null for the whole country.
   */
  @Query(
      nativeQuery = true,
      value =
          """
          select symptom_group,
                 cast(ceil(extract(epoch from (cast(:end as timestamptz) - reported_at)) / 604800)
                      as integer) - 1 as weeks_ago,
                 count(*)
          from reports
          where reported_at >= :start and reported_at < :end
            and (cast(:districtCodes as text) is null
                 or district_code = any(string_to_array(cast(:districtCodes as text), ',')))
          group by 1, 2
          """)
  List<Object[]> countByGroupAndWeek(Instant start, Instant end, String districtCodes);

  /**
   * Reports per district and week in [start, end), as {@code [districtCode, weeksAgo, count]}, with
   * the same weeks as {@link #countByGroupAndWeek}; districts and weeks with none omitted.
   */
  @Query(
      nativeQuery = true,
      value =
          """
          select district_code,
                 cast(ceil(extract(epoch from (cast(:end as timestamptz) - reported_at)) / 604800)
                      as integer) - 1 as weeks_ago,
                 count(*)
          from reports
          where reported_at >= :start and reported_at < :end
          group by 1, 2
          """)
  List<Object[]> countByDistrictAndWeek(Instant start, Instant end);
}
