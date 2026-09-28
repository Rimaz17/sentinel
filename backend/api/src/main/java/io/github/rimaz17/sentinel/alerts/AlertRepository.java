package io.github.rimaz17.sentinel.alerts;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface AlertRepository extends JpaRepository<Alert, Long> {

  @EntityGraph(attributePaths = "district")
  List<Alert> findAllByOrderByLastDetectedAtDescIdDesc(Limit limit);

  @EntityGraph(attributePaths = "district")
  List<Alert> findByDistrictCodeOrderByLastDetectedAtDescIdDesc(String districtCode, Limit limit);

  /**
   * Open alerts per district, as {@code [districtCode, count]} rows; districts with none omitted.
   */
  @Query(
      """
      select a.district.code, count(a) from Alert a
      where a.status <> io.github.rimaz17.sentinel.alerts.AlertStatus.CLOSED
        and a.lastDetectedAt >= :lastDetectedSince
      group by a.district.code
      """)
  List<Object[]> countOpenByDistrict(Instant lastDetectedSince);
}
