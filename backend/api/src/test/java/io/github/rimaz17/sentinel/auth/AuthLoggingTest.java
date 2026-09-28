package io.github.rimaz17.sentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.jayway.jsonpath.JsonPath;
import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.logging.LogLevel;
import org.springframework.boot.logging.LoggingSystem;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * No password, invite code, activation link or token reaches the logs, with the web, security and
 * persistence layers logging everything they can, on success and on failure alike.
 *
 * <p>Hibernate's bind trace does print the hashes stored in place of these secrets. It is a
 * developer's own debugging switch and never on otherwise; the secrets themselves never appear.
 */
@IntegrationTest
@ExtendWith(OutputCaptureExtension.class)
class AuthLoggingTest {

  private static final List<String> VERBOSE =
      List.of(
          "org.springframework.web",
          "org.springframework.security",
          "org.hibernate.SQL",
          "org.hibernate.orm.jdbc.bind");

  private static final String PASSWORD = "a password nobody should read";
  private static final String NEW_PASSWORD = "the inspector's own secret";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;

  private final LoggingSystem logging = LoggingSystem.get(getClass().getClassLoader());

  @BeforeEach
  void logEverything() {
    accounts.clear();
    VERBOSE.forEach(logger -> logging.setLogLevel(logger, LogLevel.TRACE));
  }

  @AfterEach
  void restoreLevels() {
    VERBOSE.forEach(logger -> logging.setLogLevel(logger, null));
  }

  @Test
  void noSecretIsLogged(CapturedOutput output) throws Exception {
    long admin = accounts.admin("admin@example.org", PASSWORD);
    String code =
        JsonPath.read(
            mvc.perform(
                    post("/api/admin/facilities/LKY0001016/invite-code").with(accounts.as(admin)))
                .andReturn()
                .getResponse()
                .getContentAsString(),
            "$.inviteCode");
    String link =
        JsonPath.read(
            mvc.perform(
                    post("/api/admin/inspectors")
                        .with(accounts.as(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            "{\"email\": \"phi@example.org\", \"displayName\": \"PHI\","
                                + " \"districts\": [\"KDY\"]}"))
                .andReturn()
                .getResponse()
                .getContentAsString(),
            "$.activationToken");

    MvcResult registered =
        send(
            "/api/auth/register",
            """
            {"inviteCode": "%s", "displayName": "Clinic", "email": "clinic@example.org",
             "password": "%s"}
            """
                .formatted(code, PASSWORD));
    send("/api/auth/signin", signIn("clinic@example.org", "wrong " + PASSWORD));
    send("/api/auth/register", "{\"inviteCode\": \"%s\", \"password\": \"x\"}".formatted(code));
    MvcResult activated =
        send(
            "/api/auth/activate",
            "{\"token\": \"%s\", \"password\": \"%s\"}".formatted(link, NEW_PASSWORD));
    String refresh = cookie(activated);
    mvc.perform(post("/api/auth/refresh").cookie(new Cookie(Sessions.REFRESH_COOKIE, refresh)));
    String accessToken =
        JsonPath.read(registered.getResponse().getContentAsString(), "$.accessToken");

    assertThat(output.getAll())
        .as("verbose logging was captured, so its absence of secrets means something")
        .contains("/api/auth/register", "insert into accounts")
        .doesNotContain(PASSWORD, NEW_PASSWORD, code, code.replace("-", ""), link, refresh)
        .doesNotContain(accessToken);
  }

  private MvcResult send(String path, String body) throws Exception {
    return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body))
        .andReturn();
  }

  private static String signIn(String email, String password) {
    return "{\"email\": \"%s\", \"password\": \"%s\"}".formatted(email, password);
  }

  private static String cookie(MvcResult result) {
    String header = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
    return header.substring(Sessions.REFRESH_COOKIE.length() + 1, header.indexOf(';'));
  }
}
