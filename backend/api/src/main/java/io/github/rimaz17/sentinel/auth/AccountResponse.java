package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.Role;
import io.github.rimaz17.sentinel.facilities.Facility;
import java.util.List;

/**
 * The signed-in account, as the browser needs it: who they are, what they may do and where.
 *
 * @param districts an inspector's districts, {@code ["*"]} for every district; empty for other
 *     roles
 * @param facility a data provider's facility; null for other roles
 */
record AccountResponse(
    long id,
    String email,
    String displayName,
    Role role,
    List<String> districts,
    FacilitySummary facility) {

  record FacilitySummary(String code, String name, String districtCode) {}

  static AccountResponse from(Account account) {
    Facility facility = account.getFacility();
    return new AccountResponse(
        account.getId(),
        account.getEmail(),
        account.getDisplayName(),
        account.getRole(),
        account.getRole() == Role.PHI ? account.getScope().entries() : List.of(),
        facility == null
            ? null
            : new FacilitySummary(
                facility.getCode(), facility.getName(), facility.getDistrictCode()));
  }
}
