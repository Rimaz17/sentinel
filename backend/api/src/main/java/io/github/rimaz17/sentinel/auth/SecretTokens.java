package io.github.rimaz17.sentinel.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Random bearer secrets: refresh tokens and activation links. Each is 256 random bits, so a fast
 * hash is enough to store it by; BCrypt's slowness protects guessable passwords, and these are not
 * guessable.
 */
public final class SecretTokens {

  private static final SecureRandom RANDOM = new SecureRandom();
  private static final int BYTES = 32;

  private SecretTokens() {}

  /** A new token, URL-safe so it can travel in a link. */
  public static String generate() {
    byte[] bytes = new byte[BYTES];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  /** What is stored in place of the token. */
  public static String hash(String token) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("every Java runtime provides SHA-256", e);
    }
  }
}
