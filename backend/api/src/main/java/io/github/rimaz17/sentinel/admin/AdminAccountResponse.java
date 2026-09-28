package io.github.rimaz17.sentinel.admin;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.Role;
import io.github.rimaz17.sentinel.facilities.Facility;
import java.time.Instant;
import java.util.List;

/**
 * A staff account as an administrator manages it. Never the password hash, and never an activation
 * link after the moment it is issued.
 *
 * @param districts an inspector's districts, {@code ["*"]} for every district; empty otherwise
 * @param activated whether the account has a password yet
 * @param activationExpiresAt when its outstanding activation link expires; null if it has none
 */
record AdminAccountResponse(
    long id,
    String email,
    String displayName,
    Role role,
    List<String> districts,
    String facilityCode,
    String facilityName,
    boolean enabled,
    boolean activated,
    Instant createdAt,
    Instant activationExpiresAt) {

  static AdminAccountResponse from(Account account, Instant activationExpiresAt) {
    Facility facility = account.getFacility();
    return new AdminAccountResponse(
        account.getId(),
        account.getEmail(),
        account.getDisplayName(),
        account.getRole(),
        account.getRole() == Role.PHI ? account.getScope().entries() : List.of(),
        facility == null ? null : facility.getCode(),
        facility == null ? null : facility.getName(),
        account.isEnabled(),
        account.isActivated(),
        account.getCreatedAt(),
        activationExpiresAt);
  }
}
