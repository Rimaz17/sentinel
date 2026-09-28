package io.github.rimaz17.sentinel.admin;

import io.github.rimaz17.sentinel.facilities.Facility;
import io.github.rimaz17.sentinel.facilities.FacilityCategory;
import java.time.Instant;

/**
 * A registry entry as an administrator manages it: whether it has an invite code, and how many data
 * provider accounts have registered for it. The code itself is never shown again after it is
 * issued.
 *
 * @param inviteIssuedAt when the current code was issued; null if the facility has none
 */
record AdminFacilityResponse(
    String code,
    String name,
    String districtCode,
    FacilityCategory category,
    String institutionType,
    Instant inviteIssuedAt,
    long dataProviderAccounts) {

  static AdminFacilityResponse from(Facility facility, Instant inviteIssuedAt, long accounts) {
    return new AdminFacilityResponse(
        facility.getCode(),
        facility.getName(),
        facility.getDistrictCode(),
        facility.getCategory(),
        facility.getInstitutionType(),
        inviteIssuedAt,
        accounts);
  }
}
