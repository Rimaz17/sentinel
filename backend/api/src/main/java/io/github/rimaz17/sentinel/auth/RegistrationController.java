package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.demo.DemoGuard;
import io.github.rimaz17.sentinel.districts.District;
import io.github.rimaz17.sentinel.districts.DistrictService;
import io.github.rimaz17.sentinel.facilities.Facility;
import io.github.rimaz17.sentinel.facilities.InviteCodes;
import io.github.rimaz17.sentinel.web.ApiProblem;
import io.github.rimaz17.sentinel.web.InvalidFieldException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registration for data providers, and only for them. It needs a valid facility invite code: the
 * account is created for the facility the code belongs to, and without one no account can be
 * created at all. Inspectors and administrators have no route here.
 */
@RestController
@RequestMapping("/api/auth")
class RegistrationController {

  static final String UNKNOWN_CODE =
      "No facility has this invite code. Check it with whoever gave it to your facility.";

  private final InviteCodes inviteCodes;
  private final AccountService accounts;
  private final DistrictService districts;
  private final Sessions sessions;
  private final DemoGuard demo;

  RegistrationController(
      InviteCodes inviteCodes,
      AccountService accounts,
      DistrictService districts,
      Sessions sessions,
      DemoGuard demo) {
    this.inviteCodes = inviteCodes;
    this.accounts = accounts;
    this.districts = districts;
    this.sessions = sessions;
    this.demo = demo;
  }

  record InviteCheck(@NotBlank @Size(max = 32) String inviteCode) {

    @Override
    public String toString() {
      return "InviteCheck[invite code redacted]";
    }
  }

  /** The facility an invite code belongs to, so a person can confirm it is theirs. */
  record InvitePreview(
      String facilityCode,
      String facilityName,
      String institutionType,
      String districtCode,
      String districtName) {}

  record Registration(
      @NotBlank @Size(max = 32) String inviteCode,
      @NotBlank @Size(max = 100) String displayName,
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(max = 200) String password) {

    @Override
    public String toString() {
      return "Registration[invite code, name, email and password redacted]";
    }
  }

  /** Names the facility before anyone types a password, so a wrong code is caught first. */
  @PostMapping("/invite-codes/check")
  InvitePreview check(@Valid @RequestBody InviteCheck request) {
    Facility facility =
        inviteCodes
            .facilityFor(request.inviteCode())
            .orElseThrow(() -> new ApiProblem(HttpStatus.NOT_FOUND, UNKNOWN_CODE));
    String districtName =
        districts
            .findByCode(facility.getDistrictCode())
            .map(District::getName)
            .orElse(facility.getDistrictCode());
    return new InvitePreview(
        facility.getCode(),
        facility.getName(),
        facility.getInstitutionType(),
        facility.getDistrictCode(),
        districtName);
  }

  /**
   * Creates the account and signs its owner straight in. Registering with a code the demo
   * administrator issued, the published demo code among them, marks the account as a visitor's.
   */
  @PostMapping("/register")
  ResponseEntity<SessionResponse> register(@Valid @RequestBody Registration request) {
    InviteCodes.Invite invite =
        inviteCodes
            .find(request.inviteCode())
            .orElseThrow(() -> new InvalidFieldException("inviteCode", UNKNOWN_CODE));
    Account account =
        accounts.registerDataProvider(
            request.email(),
            request.displayName(),
            request.password(),
            invite.facility(),
            demo.madeInDemo(invite.issuedBy()));
    return sessions.start(account, HttpStatus.CREATED);
  }
}
