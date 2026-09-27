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
   * Reports per district in [from, to), as {@code [districtCode, count]}; empty districts omitted.
   */
  @Query(
      """
      select r.districtCode, count(r) from Report r
      where r.reportedAt >= :from and r.reportedAt < :to
      group by r.districtCode
      """)
  List<Object[]> countByDistrict(Instant from, Instant to);
}
