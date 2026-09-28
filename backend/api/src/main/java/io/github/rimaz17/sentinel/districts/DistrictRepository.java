package io.github.rimaz17.sentinel.districts;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface DistrictRepository extends JpaRepository<District, String> {

  List<District> findAllByOrderByNameAsc();
}
