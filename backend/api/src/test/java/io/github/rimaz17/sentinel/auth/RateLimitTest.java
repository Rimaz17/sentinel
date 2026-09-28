package io.github.rimaz17.sentinel.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * The limits as the running API applies them, in a context of its own with low limits and a clock
 * that stands still, so a test never straddles the turn of a minute.
 */
@IntegrationTest
@Import(RateLimitTest.StoppedClock.class)
@TestPropertySource(
    properties = {
      "sentinel.rate-limit.auth-per-minute=3",
      "sentinel.rate-limit.ingestion-per-minute=2"
    })
class RateLimitTest {

  @TestConfiguration(proxyBeanMethods = false)
  static class StoppedClock {

    @Bean
    @Primary
    Clock stoppedClock() {
      return Clock.fixed(Instant.now().truncatedTo(ChronoUnit.MINUTES), ZoneOffset.UTC);
    }
  }

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void clear() {
    jdbc.update("delete from reports");
    accounts.clear();
  }

  @Test
  void limitsSignInAttemptsFromOneAddress() throws Exception {
    for (int i = 0; i < 3; i++) {
      signInFrom("10.0.0.1").andExpect(status().isUnauthorized());
    }

    signInFrom("10.0.0.1")
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
        .andExpect(jsonPath("$.detail").value(RateLimitFilter.SLOW_DOWN));
    signInFrom("10.0.0.2").andExpect(status().isUnauthorized());
  }

  @Test
  void limitsInviteCodeGuessingFromOneAddress() throws Exception {
    for (int i = 0; i < 3; i++) {
      checkCodeFrom("10.0.0.3").andExpect(status().isNotFound());
    }

    checkCodeFrom("10.0.0.3").andExpect(status().isTooManyRequests());
  }

  @Test
  void limitsSubmissionsPerDataProviderAccount() throws Exception {
    long provider =
        accounts.dataProvider("clinic@example.org", "a long enough password", "LKY0001016");

    submit(accounts.as(provider)).andExpect(status().isAccepted());
    submit(accounts.as(provider)).andExpect(status().isAccepted());
    submit(accounts.as(provider)).andExpect(status().isTooManyRequests());
  }

  @Test
  void neverLimitsTheReportFeed() throws Exception {
    for (int i = 0; i < 5; i++) {
      submit(TestAccounts.asFeed()).andExpect(status().isAccepted());
    }
  }

  private ResultActions signInFrom(String address) throws Exception {
    return mvc.perform(
        post("/api/auth/signin")
            .with(from(address))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\": \"nobody@example.org\", \"password\": \"not a password\"}"));
  }

  private ResultActions checkCodeFrom(String address) throws Exception {
    return mvc.perform(
        post("/api/auth/invite-codes/check")
            .with(from(address))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"inviteCode\": \"KDY-AAA-AAAA\"}"));
  }

  private ResultActions submit(RequestPostProcessor as) throws Exception {
    String reportedAt =
        OffsetDateTime.now(ZoneOffset.ofHoursMinutes(5, 30))
            .minusHours(2)
            .truncatedTo(ChronoUnit.SECONDS)
            .toString();
    return mvc.perform(
        post("/api/ingestion/reports")
            .with(as)
            .header("X-Facility-Code", "LKY0001016")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"symptomGroup": "DENGUE_LIKE", "reportedAt": "%s", "age": 37}
                """
                    .formatted(reportedAt)));
  }

  private static RequestPostProcessor from(String address) {
    return request -> {
      request.setRemoteAddr(address);
      return request;
    };
  }
}
