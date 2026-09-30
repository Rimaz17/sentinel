package io.github.rimaz17.sentinel.demo;

import io.github.rimaz17.sentinel.accounts.Role;
import java.util.List;

/**
 * The four accounts the public demonstration publishes, one for each way into the system, all in
 * Colombo where they are tied to a place. They sign in with the demo password and are put back as
 * they are here every night.
 *
 * <p>Their addresses are under {@code demo.sentinel.test}, a name that can never receive mail.
 */
public enum DemoAccount {
  ADMINISTRATOR("admin@demo.sentinel.test", "Demo administrator", Role.ADMIN, List.of()),
  NATIONAL_INSPECTOR(
      "inspector.national@demo.sentinel.test",
      "Demo inspector, every district",
      Role.PHI,
      List.of("*")),
  COLOMBO_INSPECTOR(
      "inspector.colombo@demo.sentinel.test", "Demo inspector, Colombo", Role.PHI, List.of("CMB")),
  DATA_PROVIDER(
      "records.idh@demo.sentinel.test", "Demo records officer", Role.DATA_PROVIDER, List.of());

  /**
   * The demo's facility: the Infectious Diseases Hospital at Angoda, in Colombo. The demo data
   * provider reports for it, and the published invite code is its code.
   */
  public static final String FACILITY_CODE = "LCB0000117";

  private final String email;
  private final String displayName;
  private final Role role;
  private final List<String> districts;

  DemoAccount(String email, String displayName, Role role, List<String> districts) {
    this.email = email;
    this.displayName = displayName;
    this.role = role;
    this.districts = districts;
  }

  public String email() {
    return email;
  }

  public String displayName() {
    return displayName;
  }

  public Role role() {
    return role;
  }

  /** An inspector's districts, {@code ["*"]} for every district; empty for other roles. */
  public List<String> districts() {
    return districts;
  }
}
