package io.github.rimaz17.sentinel.alerts;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

interface AlertClusterRepository extends JpaRepository<AlertCluster, Long> {

  /** The clusters of the given alerts, the most reports first, with their nearest facilities. */
  @EntityGraph(attributePaths = "nearestFacility")
  List<AlertCluster> findByAlertIdInOrderByReportCountDescIdAsc(Collection<Long> alertIds);
}
