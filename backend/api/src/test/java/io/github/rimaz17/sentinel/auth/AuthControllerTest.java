package io.github.rimaz17.sentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class AuthControllerTest {

  private static final String PASSWORD = "correct horse battery";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired JdbcTemplate jdbc;

  private long inspector;

  @BeforeEach
  void createAccounts() {
    accounts.clear();
    inspector = accounts.inspector("phi@example.org", PASSWORD, "KDY");
  }

  @Test
  void signsInAndDescribesTheAccount() throws Exception {
    signIn("phi@example.org", PASSWORD)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").isNotEmpty())
        .andExpect(jsonPath("$.accessTokenExpiresAt").isNotEmpty())
        .andExpect(jsonPath("$.account.id").value(inspector))
        .andExpect(jsonPath("$.account.email").value("phi@example.org"))
        .andExpect(jsonPath("$.account.role").value("PHI"))
        .andExpect(jsonPath("$.account.districts[0]").value("KDY"))
        .andExpect(jsonPath("$.account.facility").isEmpty());
  }

  @Test
  void putsTheRefreshTokenInACookieScriptsCannotRead() throws Exception {
    signIn("phi@example.org", PASSWORD)
        .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("sentinel_refresh=")))
        .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
        .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Strict")))
        .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Path=/api/auth")))
        .andExpect(jsonPath("$.refreshToken").doesNotExist());
  }

  @Test
  void acceptsTheEmailAddressInAnyCase() throws Exception {
    signIn(" PHI@Example.org ", PASSWORD).andExpect(status().isOk());
  }

  @Test
  void refusesAWrongPasswordAndAnUnknownAddressInTheSameWords() throws Exception {
    signIn("phi@example.org", "not the password")
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.detail").value(SignInService.FAILED));
    signIn("nobody@example.org", PASSWORD)
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.detail").value(SignInService.FAILED));
  }

  @Test
  void refusesAnInspectorWhoHasNotSetAPassword() throws Exception {
    accounts.inspector("new@example.org", null, "CMB");

    signIn("new@example.org", "").andExpect(status().isBadRequest());
    signIn("new@example.org", PASSWORD).andExpect(status().isUnauthorized());
  }

  @Test
  void refusesADisabledAccountEvenWithItsPassword() throws Exception {
    jdbc.update("update accounts set enabled = false where id = ?", inspector);

    signIn("phi@example.org", PASSWORD)
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.detail").value(SignInService.DISABLED));
  }

  @Test
  void neverReturnsThePasswordOrItsHash() throws Exception {
    String body =
        signIn("phi@example.org", PASSWORD).andReturn().getResponse().getContentAsString();

    assertThat(body).doesNotContain(PASSWORD).doesNotContain("$2a$").doesNotContain("password");
  }

  @Test
  void renewsASessionWithANewRefreshToken() throws Exception {
    String first = refreshCookie(signIn("phi@example.org", PASSWORD).andReturn());

    MvcResult renewed =
        refresh(first)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.account.email").value("phi@example.org"))
            .andReturn();

    assertThat(refreshCookie(renewed)).isNotEmpty().isNotEqualTo(first);
  }

  @Test
  void refusesToRenewWithoutACookie() throws Exception {
    mvc.perform(post("/api/auth/refresh"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.detail").value(RefreshTokens.NOT_SIGNED_IN));
  }

  @Test
  void refusesAnUnknownRefreshToken() throws Exception {
    refresh("made-up").andExpect(status().isUnauthorized());
  }

  @Test
  void aReplacedTokenPresentedAtOnceIsRefusedWithoutEndingTheSession() throws Exception {
    String first = refreshCookie(signIn("phi@example.org", PASSWORD).andReturn());
    String second = refreshCookie(refresh(first).andReturn());

    // A second tab sent the same cookie a moment later.
    refresh(first).andExpect(status().isUnauthorized());

    refresh(second).andExpect(status().isOk());
  }

  @Test
  void aReplacedTokenPresentedLaterEndsEverySessionTheAccountHolds() throws Exception {
    String first = refreshCookie(signIn("phi@example.org", PASSWORD).andReturn());
    String second = refreshCookie(refresh(first).andReturn());
    jdbc.update(
        "update refresh_tokens set revoked_at = revoked_at - interval '2 minutes'"
            + " where revoked_reason = 'ROTATED'");

    refresh(first).andExpect(status().isUnauthorized());

    refresh(second).andExpect(status().isUnauthorized());
    assertThat(
            jdbc.queryForObject(
                "select count(*) from refresh_tokens where revoked_reason = 'REUSED'", Long.class))
        .isEqualTo(1);
  }

  @Test
  void refusesToRenewADisabledAccount() throws Exception {
    String cookie = refreshCookie(signIn("phi@example.org", PASSWORD).andReturn());
    jdbc.update("update accounts set enabled = false where id = ?", inspector);

    refresh(cookie).andExpect(status().isUnauthorized());
  }

  @Test
  void refusesAnExpiredRefreshToken() throws Exception {
    String cookie = refreshCookie(signIn("phi@example.org", PASSWORD).andReturn());
    jdbc.update(
        "update refresh_tokens set issued_at = now() - interval '13 hours',"
            + " expires_at = now() - interval '1 hour'");

    refresh(cookie).andExpect(status().isUnauthorized());
  }

  @Test
  void signingOutEndsTheSessionAndClearsTheCookie() throws Exception {
    String cookie = refreshCookie(signIn("phi@example.org", PASSWORD).andReturn());

    mvc.perform(post("/api/auth/signout").cookie(new Cookie(Sessions.REFRESH_COOKIE, cookie)))
        .andExpect(status().isNoContent())
        .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

    refresh(cookie).andExpect(status().isUnauthorized());
  }

  @Test
  void describesTheSignedInAccount() throws Exception {
    mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, accounts.bearer(inspector)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("phi@example.org"))
        .andExpect(jsonPath("$.districts[0]").value("KDY"));
  }

  @Test
  void describesADataProvidersFacility() throws Exception {
    long provider = accounts.dataProvider("clinic@example.org", PASSWORD, "LKY0001016");

    mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, accounts.bearer(provider)))
        .andExpect(jsonPath("$.role").value("DATA_PROVIDER"))
        .andExpect(jsonPath("$.facility.code").value("LKY0001016"))
        .andExpect(jsonPath("$.facility.districtCode").value("KDY"))
        .andExpect(jsonPath("$.districts").isEmpty());
  }

  @Test
  void refusesToDescribeAnyoneWithoutAToken() throws Exception {
    mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
  }

  private ResultActions signIn(String email, String password) throws Exception {
    return mvc.perform(
        post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"email": "%s", "password": "%s"}
                """
                    .formatted(email, password)));
  }

  private ResultActions refresh(String cookie) throws Exception {
    return mvc.perform(
        post("/api/auth/refresh").cookie(new Cookie(Sessions.REFRESH_COOKIE, cookie)));
  }

  private static String refreshCookie(MvcResult result) {
    String header = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
    assertThat(header).startsWith(Sessions.REFRESH_COOKIE + "=");
    return header.substring(Sessions.REFRESH_COOKIE.length() + 1, header.indexOf(';'));
  }
}
