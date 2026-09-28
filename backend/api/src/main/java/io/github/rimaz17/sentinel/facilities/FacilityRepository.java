package io.github.rimaz17.sentinel.facilities;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface FacilityRepository extends JpaRepository<Facility, Long> {

  Optional<Facility> findByCode(String code);

  List<Facility> findAllByOrderByCodeAsc();

  List<Facility> findByDistrictCodeInOrderByCodeAsc(Collection<String> districtCodes);
}
