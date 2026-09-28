package io.github.rimaz17.sentinel.admin;

import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.auth.Caller;
import io.github.rimaz17.sentinel.facilities.Facility;
import io.github.rimaz17.sentinel.facilities.FacilityService;
import io.github.rimaz17.sentinel.facilities.InviteCodes;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The facility registry and its invite codes, for administrators. */
@RestController
@RequestMapping("/api/admin/facilities")
class AdminFacilityController {

  private final FacilityService facilities;
  private final InviteCodes inviteCodes;
  private final AccountService accounts;

  AdminFacilityController(
      FacilityService facilities, InviteCodes inviteCodes, AccountService accounts) {
    this.facilities = facilities;
    this.inviteCodes = inviteCodes;
    this.accounts = accounts;
  }

  /** The registry, or one district of it, with each facility's invite status. */
  @GetMapping
  List<AdminFacilityResponse> list(
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    List<Facility> found = facilities.inDistricts(district == null ? null : List.of(district));
    Map<Long, Instant> issued =
        inviteCodes.issuedAtByFacility(found.stream().map(Facility::getId).toList());
    Map<Long, Long> registered = accounts.dataProviderCountsByFacility();
    return found.stream()
        .map(
            facility ->
                AdminFacilityResponse.from(
                    facility,
                    issued.get(facility.getId()),
                    registered.getOrDefault(facility.getId(), 0L)))
        .toList();
  }

  /**
   * Issues a facility a new invite code, replacing any it had. The code is in this response and
   * nowhere else, so the response must not be cached.
   */
  @PostMapping("/{code}/invite-code")
  ResponseEntity<InviteCodes.IssuedCode> issue(Caller.Staff admin, @PathVariable String code) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .cacheControl(CacheControl.noStore())
        .body(inviteCodes.issue(code, admin.accountId()));
  }

  @DeleteMapping("/{code}/invite-code")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void revoke(@PathVariable String code) {
    inviteCodes.revoke(code);
  }
}
