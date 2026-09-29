package io.github.rimaz17.sentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.DistrictScope;
import io.github.rimaz17.sentinel.facilities.FacilityService;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;

@IntegrationTest
class AccessTokensTest {

  @Autowired AccessTokens tokens;
  @Autowired JwtDecoder decoder;
  @Autowired FacilityService facilities;

  @Test
  void namesAnInspectorsRoleAndDistricts() {
    Account inspector =
        stored(
            Account.inspector(
                "phi@example.org", "PHI", DistrictScope.of(List.of("KDY")), Instant.now()),
            7L);

    Jwt jwt = decoder.decode(tokens.issue(inspector).value());

    assertThat(jwt.getSubject()).isEqualTo("7");
    assertThat(jwt.getClaimAsString("iss")).isEqualTo("sentinel");
    assertThat(jwt.getClaimAsString("role")).isEqualTo("PHI");
    assertThat(jwt.getClaimAsStringList("districts")).containsExactly("KDY");
    assertThat(jwt.hasClaim("facility")).isFalse();
  }

  @Test
  void namesADataProvidersFacilityAndNoDistricts() {
    Account provider =
        stored(
            Account.dataProvider(
                "clinic@example.org",
                "Clinic",
                "hash",
                facilities.findByCode("LKY0001016").orElseThrow(),
                Instant.now()),
            8L);

    Jwt jwt = decoder.decode(tokens.issue(provider).value());

    assertThat(jwt.getClaimAsString("role")).isEqualTo("DATA_PROVIDER");
    assertThat(jwt.getClaimAsString("facility")).isEqualTo("LKY0001016");
    assertThat(jwt.hasClaim("districts")).isFalse();
  }

  @Test
  void carriesNothingThatIdentifiesAPerson() {
    Account admin =
        stored(Account.administrator("admin@example.org", "Admin", "hash", Instant.now()), 9L);

    Jwt jwt = decoder.decode(tokens.issue(admin).value());

    assertThat(jwt.getClaims()).containsOnlyKeys("iss", "sub", "iat", "exp", "role");
  }

  @Test
  void expiresAfterFifteenMinutes() {
    Account admin =
        stored(Account.administrator("admin@example.org", "Admin", "hash", Instant.now()), 9L);

    AccessTokens.IssuedToken token = tokens.issue(admin);

    assertThat(Duration.between(Instant.now(), token.expiresAt()))
        .isBetween(Duration.ofMinutes(14), Duration.ofMinutes(15));
  }

  @Test
  void aTokenSignedWithAnotherKeyIsRefused() {
    Account admin =
        stored(Account.administrator("admin@example.org", "Admin", "hash", Instant.now()), 9L);
    String token = tokens.issue(admin).value();

    JwtDecoder otherKey =
        NimbusJwtDecoder.withSecretKey(
                new SecretKeySpec(
                    "a-different-key-that-is-long-enough-0123456789"
                        .getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"))
            .macAlgorithm(MacAlgorithm.HS256)
            .build();

    assertThatThrownBy(() -> otherKey.decode(token)).isInstanceOf(JwtException.class);
  }

  @Test
  void aTamperedTokenIsRefused() {
    Account inspector =
        stored(
            Account.inspector(
                "phi@example.org", "PHI", DistrictScope.of(List.of("KDY")), Instant.now()),
            7L);
    String[] parts = tokens.issue(inspector).value().split("\\.");
    String widened =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(
                new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
                    .replace("[\"KDY\"]", "[\"*\"]")
                    .getBytes(StandardCharsets.UTF_8));

    assertThatThrownBy(() -> decoder.decode(parts[0] + "." + widened + "." + parts[2]))
        .isInstanceOf(JwtException.class);
  }

  private static Account stored(Account account, long id) {
    ReflectionTestUtils.setField(account, "id", id);
    return account;
  }
}
