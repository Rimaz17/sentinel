package io.github.rimaz17.sentinel.facilities;

import java.math.BigDecimal;

/** A registry entry. Latitude and longitude are null where no location was verified. */
record FacilityResponse(
    String code,
    String name,
    String districtCode,
    FacilityCategory category,
    String institutionType,
    BigDecimal latitude,
    BigDecimal longitude) {

  static FacilityResponse from(Facility facility) {
    return new FacilityResponse(
        facility.getCode(),
        facility.getName(),
        facility.getDistrictCode(),
        facility.getCategory(),
        facility.getInstitutionType(),
        facility.getLatitude(),
        facility.getLongitude());
  }
}
