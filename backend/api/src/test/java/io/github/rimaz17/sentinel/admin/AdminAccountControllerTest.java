package io.github.rimaz17.sentinel.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class AdminAccountControllerTest {

  private static final String PASSWORD = "a long admin password";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired JdbcTemplate jdbc;

  private long admin;

  @BeforeEach
  void createAdministrator() {
    accounts.clear();
    admin = accounts.admin("admin@example.org", PASSWORD);
  }

  @Test
  void createsAnInspectorWithoutAPasswordAndReturnsTheirLinkOnce() throws Exception {
    createInspector("Nimal.Silva@Example.org", "[\"KDY\", \"MTL\"]")
        .andExpect(status().isCreated())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(jsonPath("$.account.email").value("nimal.silva@example.org"))
        .andExpect(jsonPath("$.account.role").value("PHI"))
        .andExpect(jsonPath("$.account.districts", hasSize(2)))
        .andExpect(jsonPath("$.account.activated").value(false))
        .andExpect(jsonPath("$.account.enabled").value(true))
        .andExpect(jsonPath("$.activationToken").isNotEmpty())
        .andExpect(jsonPath("$.activationExpiresAt").isNotEmpty());

    assertThat(
            jdbc.queryForObject(
                "select password_hash from accounts where role = 'PHI'", String.class))
        .isNull();
  }

  @Test
  void createsANationalInspectorWithTheWildcard() throws Exception {
    createInspector("national@example.org", "[\"*\"]")
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.account.districts[0]").value("*"));
  }

  @Test
  void refusesAnInspectorWithNoDistricts() throws Exception {
    createInspector("phi@example.org", "[]")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("districts"));
    createInspector("phi@example.org", "null").andExpect(status().isBadRequest());
  }

  @Test
  void refusesADistrictThatDoesNotExistOrAWildcardAmongDistricts() throws Exception {
    createInspector("phi@example.org", "[\"KDY\", \"XYZ\"]").andExpect(status().isBadRequest());
    createInspector("phi@example.org", "[\"KDY\", \"*\"]").andExpect(status().isBadRequest());

    assertThat(jdbc.queryForObject("select count(*) from accounts", Long.class)).isEqualTo(1);
  }

  @Test
  void refusesAnAddressThatAlreadyHasAnAccount() throws Exception {
    createInspector("phi@example.org", "[\"KDY\"]").andExpect(status().isCreated());

    createInspector("PHI@example.org", "[\"CMB\"]").andExpect(status().isConflict());
  }

  @Test
  void keepsOnlyAHashOfTheActivationLink() throws Exception {
    String body =
        createInspector("phi@example.org", "[\"KDY\"]")
            .andReturn()
            .getResponse()
            .getContentAsString();
    String token = body.replaceAll(".*\"activationToken\":\"([^\"]+)\".*", "$1");

    assertThat(jdbc.queryForObject("select token_hash from activation_tokens", String.class))
        .isNotEqualTo(token)
        .hasSize(64);
  }

  @Test
  void listsAccountsWithoutAnyPasswordOrLink() throws Exception {
    createInspector("phi@example.org", "[\"KDY\"]");
    accounts.dataProvider("clinic@example.org", PASSWORD, "LKY0001016");

    String body =
        mvc.perform(get("/api/admin/accounts").with(accounts.as(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3)))
            .andExpect(jsonPath("$[?(@.role == 'PHI')].activationExpiresAt").isNotEmpty())
            .andExpect(jsonPath("$[?(@.role == 'DATA_PROVIDER')].facilityCode").value("LKY0001016"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(body)
        .doesNotContain("$2a$")
        .doesNotContain("activationToken")
        .doesNotContain(PASSWORD);
  }

  @Test
  void listsOneRole() throws Exception {
    createInspector("phi@example.org", "[\"KDY\"]");

    mvc.perform(get("/api/admin/accounts").param("role", "PHI").with(accounts.as(admin)))
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].email").value("phi@example.org"));
  }

  @Test
  void thereIsNoOtherRouteToAnInspectorAccount() throws Exception {
    mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"displayName": "PHI", "email": "phi@example.org",
                     "password": "%s", "role": "PHI"}
                    """
                        .formatted(PASSWORD)))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/admin/inspectors")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"phi@example.org\", \"displayName\": \"PHI\"}"))
        .andExpect(status().isUnauthorized());

    assertThat(jdbc.queryForObject("select count(*) from accounts where role = 'PHI'", Long.class))
        .isZero();
  }

  private ResultActions createInspector(String email, String districts) throws Exception {
    return mvc.perform(
        post("/api/admin/inspectors")
            .with(accounts.as(admin))
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"email": "%s", "displayName": "Nimal Silva", "districts": %s}
                """
                    .formatted(email, districts)));
  }
}
