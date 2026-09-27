package io.github.rimaz17.sentinel.reports;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ReportRepository extends JpaRepository<Report, UUID> {

  @EntityGraph(attributePaths = "facility")
  List<Report> findAllByOrderByReportedAtDescIdDesc(Limit limit);

  @EntityGraph(attributePaths = "facility")
  List<Report> findByDistrictCodeOrderByReportedAtDescIdDesc(String districtCode, Limit limit);

  /**
   * Reports with a location that presented in [from, to), newest first, for the map. A null
   * district means the whole country.
   */
  @Query(
      """
      select r from Report r join fetch r.facility
      where r.latitude is not null
        and r.reportedAt >= :from and r.reportedAt < :to
        and (:district is null or r.districtCode = :district)
      order by r.reportedAt desc, r.id desc
      """)
  List<Report> findLocated(Instant from, Instant to, String district, Limit limit);

  /**
   * Reports per district in [from, to), as {@code [districtCode, count]}; empty districts omitted.
   */
  @Query(
      """
      select r.districtCode, count(r) from Report r
      where r.reportedAt >= :from and r.reportedAt < :to
      group by r.districtCode
      """)
  List<Object[]> countByDistrict(Instant from, Instant to);

  /**
   * Reports per symptom group and week in [start, end), as {@code [symptomGroup, weeksAgo, count]}.
   * Week 0 is [end - 7 days, end), week 1 the seven days before it, and so on: the detector's own
   * bucketing (backend/detector/sentinel_detector/store.py). A null district counts the whole
   * country.
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
            and (cast(:district as text) is null or district_code = cast(:district as text))
          group by 1, 2
          """)
  List<Object[]> countByGroupAndWeek(Instant start, Instant end, String district);
}
