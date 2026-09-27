package io.github.rimaz17.sentinel.reports;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

interface ReportRepository extends JpaRepository<Report, UUID> {

  @EntityGraph(attributePaths = "facility")
  List<Report> findAllByOrderByReportedAtDescIdDesc(Limit limit);

  @EntityGraph(attributePaths = "facility")
  List<Report> findByDistrictCodeOrderByReportedAtDescIdDesc(String districtCode, Limit limit);
}
