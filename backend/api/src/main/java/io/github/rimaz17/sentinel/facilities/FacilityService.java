package io.github.rimaz17.sentinel.facilities;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class FacilityService {

  private final FacilityRepository facilities;

  FacilityService(FacilityRepository facilities) {
    this.facilities = facilities;
  }

  public List<Facility> all() {
    return facilities.findAllByOrderByCodeAsc();
  }

  public List<Facility> inDistrict(String districtCode) {
    return facilities.findByDistrictCodeOrderByCodeAsc(districtCode);
  }

  public Optional<Facility> findByCode(String code) {
    return facilities.findByCode(code);
  }

  /** A reference for use as a foreign key, without loading the row. */
  public Facility reference(long id) {
    return facilities.getReferenceById(id);
  }
}
