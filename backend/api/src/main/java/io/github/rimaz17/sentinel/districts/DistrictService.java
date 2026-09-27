package io.github.rimaz17.sentinel.districts;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DistrictService {

  private final DistrictRepository districts;

  DistrictService(DistrictRepository districts) {
    this.districts = districts;
  }

  /** Every district, alphabetically by name. */
  public List<District> all() {
    return districts.findAllByOrderByNameAsc();
  }

  public Optional<District> findByCode(String code) {
    return districts.findById(code);
  }
}
