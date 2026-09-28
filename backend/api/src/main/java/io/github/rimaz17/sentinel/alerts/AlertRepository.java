package io.github.rimaz17.sentinel.alerts;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface AlertRepository extends JpaRepository<Alert, Long> {

  @EntityGraph(attributePaths = "district")
  Optional<Alert> findByCode(String code);

  /**
   * Moves an alert from one status to another. Only the status column is written, so the detector's
   * concurrent updates to the figures are never overwritten; and only if the alert is still in the
   * status the inspector saw, so two inspectors cannot both move it. Returns the number of rows
   * changed.
   */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      nativeQuery = true,
      value = "update alerts set status = :to where code = :code and status = :from")
  int moveStatus(String code, String from, String to);

  /**
   * Records a verdict on an alert that has none and is not closed. A false alarm closes it in the
   * same statement. Returns the number of rows changed.
   */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      nativeQuery = true,
      value =
          """
          update alerts
          set verdict = :verdict, verdict_at = :at, verdict_by = :accountId,
              status = case when cast(:verdict as text) = 'FALSE_ALARM' then 'CLOSED' else status end
          where code = :code and verdict is null and status <> 'CLOSED'
          """)
  int recordVerdict(String code, String verdict, Instant at, long accountId);

  @EntityGraph(attributePaths = "district")
  List<Alert> findAllByOrderByLastDetectedAtDescIdDesc(Limit limit);

  @EntityGraph(attributePaths = "district")
  List<Alert> findByDistrictCodeInOrderByLastDetectedAtDescIdDesc(
      Collection<String> districtCodes, Limit limit);

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
