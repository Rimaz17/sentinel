package io.github.rimaz17.sentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

/** An inspector follows the link an administrator gave them to set their password. */
@IntegrationTest
class ActivationTest {

  private static final String PASSWORD = "an inspector's own password";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired AccountService accountService;
  @Autowired ActivationLinks links;
  @Autowired JdbcTemplate jdbc;

  private Account inspector;
  private String token;

  @BeforeEach
  void createInspectorWithALink() {
    accounts.clear();
    inspector = accountService.createInspector("phi@example.org", "Nimal Silva", List.of("KDY"));
    token = links.issue(inspector).token();
  }

  @Test
  void namesTheLinksOwner() throws Exception {
    check(token)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("phi@example.org"))
        .andExpect(jsonPath("$.displayName").value("Nimal Silva"))
        .andExpect(jsonPath("$.role").value("PHI"))
        .andExpect(jsonPath("$.activated").value(false));
  }

  @Test
  void setsThePasswordAndSignsTheInspectorIn() throws Exception {
    activate(token, PASSWORD)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").isNotEmpty())
        .andExpect(jsonPath("$.account.districts[0]").value("KDY"));

    signIn(PASSWORD).andExpect(status().isOk());
  }

  @Test
  void aLinkWorksOnce() throws Exception {
    activate(token, PASSWORD).andExpect(status().isOk());

    activate(token, "someone else's password")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].message").value(ActivationLinks.UNUSABLE));
    check(token).andExpect(status().isNotFound());
    signIn(PASSWORD).andExpect(status().isOk());
  }

  @Test
  void aRefusedPasswordLeavesTheLinkUsable() throws Exception {
    activate(token, "short")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("password"));

    activate(token, PASSWORD).andExpect(status().isOk());
  }

  @Test
  void anExpiredLinkIsRefused() throws Exception {
    jdbc.update(
        "update activation_tokens set issued_at = now() - interval '8 days',"
            + " expires_at = now() - interval '1 day'");

    check(token).andExpect(status().isNotFound());
    activate(token, PASSWORD).andExpect(status().isBadRequest());
  }

  @Test
  void aNewLinkReplacesTheOldOne() throws Exception {
    String second = links.issue(inspector).token();

    check(token).andExpect(status().isNotFound());
    check(second).andExpect(status().isOk());
  }

  @Test
  void aDisabledAccountsLinkIsRefused() throws Exception {
    jdbc.update("update accounts set enabled = false");

    activate(token, PASSWORD).andExpect(status().isBadRequest());
  }

  @Test
  void aResetLinkReplacesThePasswordAndEndsOldSessions() throws Exception {
    String session =
        refreshCookie(activate(token, PASSWORD).andExpect(status().isOk()).andReturn());

    String reset = links.issue(accountService.findById(inspector.getId()).orElseThrow()).token();
    check(reset).andExpect(jsonPath("$.activated").value(true));
    activate(reset, "a brand new password").andExpect(status().isOk());

    signIn(PASSWORD).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/auth/refresh").cookie(new Cookie(Sessions.REFRESH_COOKIE, session)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void anUnknownLinkIsRefusedInTheSameWords() throws Exception {
    check("not-a-real-link-token")
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.detail").value(ActivationLinks.UNUSABLE));
    assertThat(jdbc.queryForObject("select count(*) from activation_tokens", Long.class))
        .isEqualTo(1);
  }

  private ResultActions check(String linkToken) throws Exception {
    return mvc.perform(
        post("/api/auth/activation/check")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\": \"%s\"}".formatted(linkToken)));
  }

  private ResultActions activate(String linkToken, String password) throws Exception {
    return mvc.perform(
        post("/api/auth/activate")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\": \"%s\", \"password\": \"%s\"}".formatted(linkToken, password)));
  }

  private ResultActions signIn(String password) throws Exception {
    return mvc.perform(
        post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\": \"phi@example.org\", \"password\": \"%s\"}".formatted(password)));
  }

  private static String refreshCookie(MvcResult result) {
    String header = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
    return header.substring(Sessions.REFRESH_COOKIE.length() + 1, header.indexOf(';'));
  }
}
