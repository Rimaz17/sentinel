package io.github.rimaz17.sentinel.accounts;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * What a password must be. Length is the rule that matters, so there are no composition rules. The
 * upper limit is BCrypt's: it reads only the first 72 bytes, and a longer password would appear to
 * be accepted while being partly ignored.
 */
public final class PasswordPolicy {

  public static final int MIN_CHARACTERS = 12;
  public static final int MAX_BYTES = 72;

  private PasswordPolicy() {}

  /** Why a password is unacceptable, or empty if it is fine. Never repeats the password. */
  public static Optional<String> problem(String password) {
    if (password == null || password.codePointCount(0, password.length()) < MIN_CHARACTERS) {
      return Optional.of("must be at least " + MIN_CHARACTERS + " characters");
    }
    if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
      return Optional.of("must be at most " + MAX_BYTES + " bytes");
    }
    return Optional.empty();
  }
}
