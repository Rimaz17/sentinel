package io.github.rimaz17.sentinel.demo;

import io.github.rimaz17.sentinel.accounts.PasswordPolicy;
import java.time.LocalTime;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * The public demonstration, from the environment. Off unless switched on. See
 * docs/adr/0017-public-demo-mode.md.
 *
 * @param enabled whether the demo accounts exist and are shown on the sign-in page
 * @param password the one password every demo account signs in with; published on the sign-in page
 *     by design, so never the password of any other account
 * @param inviteCode the demo facility's invite code, published on the registration page
 * @param resetAt when, in Sri Lanka time, the demo is put back to its starting state each night
 */
@ConfigurationProperties("sentinel.demo")
public record DemoProperties(
    @DefaultValue("false") boolean enabled,
    String password,
    String inviteCode,
    @DefaultValue("03:00") LocalTime resetAt) {

  /** Three letters for the district, then seven more, dashes where the person likes them. */
  static final String INVITE_CODE_PATTERN = "[A-Za-z]{3}(-?[A-Za-z0-9]){7}";

  public DemoProperties {
    if (enabled) {
      PasswordPolicy.problem(password)
          .ifPresent(
              problem -> {
                throw new IllegalStateException("SENTINEL_DEMO_PASSWORD " + problem);
              });
      if (inviteCode == null || !inviteCode.strip().matches(INVITE_CODE_PATTERN)) {
        throw new IllegalStateException(
            "Set SENTINEL_DEMO_INVITE_CODE to a code shaped like CMB-DEM-7Q4X");
      }
      inviteCode = inviteCode.strip();
    }
  }
}
