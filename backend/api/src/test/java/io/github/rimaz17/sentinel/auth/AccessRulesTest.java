package io.github.rimaz17.sentinel.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Who may reach what. Each internal endpoint is proven closed to everyone who is not an inspector:
 * the public, data providers, administrators and the report feed.
 */
@IntegrationTest
class AccessRulesTest {

  private static final String PASSWORD = "a long enough password";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;

  private long provider;
  private long admin;

  @BeforeEach
  void createAccounts() {
    accounts.clear();
    provider = accounts.dataProvider("clinic@example.org", PASSWORD, "LKY0001016");
    admin = accounts.admin("admin@example.org", PASSWORD);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/api/districts",
        "/api/alerts",
        "/api/reports",
        "/api/reports/locations",
        "/api/reports/weekly-counts",
        "/api/facilities"
      })
  void internalDataIsClosedToAnonymousCallers(String path) throws Exception {
    mvc.perform(get(path))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.detail").value(SecurityProblems.SIGN_IN));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/api/districts",
        "/api/alerts",
        "/api/reports",
        "/api/reports/locations",
        "/api/reports/weekly-counts",
        "/api/facilities"
      })
  void internalDataIsClosedToDataProvidersAndAdministrators(String path) throws Exception {
    mvc.perform(get(path).with(accounts.as(provider)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.detail").value(SecurityProblems.NOT_PERMITTED));
    mvc.perform(get(path).with(accounts.as(admin))).andExpect(status().isForbidden());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/api/districts",
        "/api/alerts",
        "/api/reports",
        "/api/reports/locations",
        "/api/reports/weekly-counts"
      })
  void theFeedReadsNothingButTheRegistry(String path) throws Exception {
    mvc.perform(get(path).with(TestAccounts.asFeed())).andExpect(status().isForbidden());
  }

  @ParameterizedTest
  @ValueSource(strings = {"/api/facilities", "/api/alerts"})
  void anInspectorReadsInternalData(String path) throws Exception {
    mvc.perform(get(path).with(accounts.asInspector("*"))).andExpect(status().isOk());
  }

  @ParameterizedTest
  @ValueSource(strings = {"/api/admin/accounts", "/api/admin/facilities"})
  void administrationIsClosedToEveryoneButAnAdministrator(String path) throws Exception {
    mvc.perform(get(path)).andExpect(status().isUnauthorized());
    mvc.perform(get(path).with(accounts.asInspector("*"))).andExpect(status().isForbidden());
    mvc.perform(get(path).with(accounts.as(provider))).andExpect(status().isForbidden());
    mvc.perform(get(path).with(TestAccounts.asFeed())).andExpect(status().isForbidden());
  }

  @ParameterizedTest
  @ValueSource(strings = {"/api/nothing-here", "/actuator", "/api"})
  void anAddressNoRuleNamesIsRefused(String path) throws Exception {
    mvc.perform(get(path)).andExpect(status().isUnauthorized());
    mvc.perform(get(path).with(accounts.asInspector("*"))).andExpect(status().isForbidden());
  }
}
