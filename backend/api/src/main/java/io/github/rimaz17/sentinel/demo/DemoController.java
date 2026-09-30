package io.github.rimaz17.sentinel.demo;

import io.github.rimaz17.sentinel.accounts.Role;
import io.github.rimaz17.sentinel.facilities.Facility;
import io.github.rimaz17.sentinel.facilities.FacilityService;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * What the sign-in and registration pages publish in demo mode: the demo accounts with their
 * password, and the demo facility's invite code. It exists only in demo mode; otherwise the address
 * answers 404 and the pages show no demo panel. None of it is a secret: it is shown to every
 * visitor, and it opens nothing a visitor could break for the next one (see DemoGuard).
 */
@RestController
@RequestMapping("/api/public/demo")
@ConditionalOnBooleanProperty("sentinel.demo.enabled")
class DemoController {

  private final DemoProperties demo;
  private final FacilityService facilities;

  DemoController(DemoProperties demo, FacilityService facilities) {
    this.demo = demo;
    this.facilities = facilities;
  }

  /**
   * @param districts an inspector's districts, {@code ["*"]} for every district; empty otherwise
   * @param facilityName the data provider's facility; null for other roles
   */
  record DemoAccountResponse(
      Role role, String email, String displayName, List<String> districts, String facilityName) {}

  record InviteResponse(String code, String facilityName, String districtCode) {}

  /**
   * @param resetAt when the demo is reset each night, as {@code HH:mm} in Sri Lanka time
   */
  record DemoResponse(
      List<DemoAccountResponse> accounts, String password, InviteResponse invite, String resetAt) {

    /**
     * Logged by the web layer at trace level when it is returned; published, but kept out anyway.
     */
    @Override
    public String toString() {
      return "DemoResponse[password and invite code redacted]";
    }
  }

  @GetMapping
  DemoResponse describe() {
    Facility facility = facilities.findByCode(DemoAccount.FACILITY_CODE).orElseThrow();
    List<DemoAccountResponse> accounts =
        Arrays.stream(DemoAccount.values())
            .map(
                account ->
                    new DemoAccountResponse(
                        account.role(),
                        account.email(),
                        account.displayName(),
                        account.districts(),
                        account == DemoAccount.DATA_PROVIDER ? facility.getName() : null))
            .toList();
    return new DemoResponse(
        accounts,
        demo.password(),
        new InviteResponse(demo.inviteCode(), facility.getName(), facility.getDistrictCode()),
        demo.resetAt().toString());
  }
}
