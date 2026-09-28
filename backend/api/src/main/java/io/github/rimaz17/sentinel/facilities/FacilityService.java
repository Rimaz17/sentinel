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

  /** The facilities in the given districts, or the whole registry when that is null. */
  public List<Facility> inDistricts(List<String> districtCodes) {
    if (districtCodes == null) {
      return facilities.findAllByOrderByCodeAsc();
    }
    if (districtCodes.isEmpty()) {
      return List.of();
    }
    return facilities.findByDistrictCodeInOrderByCodeAsc(districtCodes);
  }

  public Optional<Facility> findByCode(String code) {
    return facilities.findByCode(code);
  }

  /** A reference for use as a foreign key, without loading the row. */
  public Facility reference(long id) {
    return facilities.getReferenceById(id);
  }
}
