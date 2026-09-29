package io.github.rimaz17.sentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.facilities.InviteCodes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Data providers register with their facility's invite code, and cannot without one. */
@IntegrationTest
class RegistrationTest {

  private static final String PERADENIYA = "LKY0001016";
  private static final String PASSWORD = "a long enough password";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired InviteCodes inviteCodes;
  @Autowired JwtDecoder decoder;
  @Autowired JdbcTemplate jdbc;

  private String code;

  @BeforeEach
  void issueACode() {
    accounts.clear();
    long admin = accounts.admin("admin@example.org", PASSWORD);
    code = inviteCodes.issue(PERADENIYA, admin).inviteCode();
  }

  @Test
  void namesTheFacilityACodeBelongsTo() throws Exception {
    mvc.perform(
            post("/api/auth/invite-codes/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"inviteCode\": \"%s\"}".formatted(code.toLowerCase())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.facilityCode").value(PERADENIYA))
        .andExpect(jsonPath("$.facilityName").value("Peradeniya"))
        .andExpect(jsonPath("$.districtName").value("Kandy"));
  }

  @Test
  void saysPlainlyWhenACodeMatchesNoFacility() throws Exception {
    mvc.perform(
            post("/api/auth/invite-codes/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"inviteCode\": \"KDY-AAA-AAAA\"}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.detail").value(RegistrationController.UNKNOWN_CODE));
  }

  @Test
  void registersADataProviderForTheCodesFacilityAndSignsThemIn() throws Exception {
    String body =
        register(code, "clinic@example.org", PASSWORD)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.account.role").value("DATA_PROVIDER"))
            .andExpect(jsonPath("$.account.facility.code").value(PERADENIYA))
            .andReturn()
            .getResponse()
            .getContentAsString();

    String token = JsonPath.read(body, "$.accessToken");
    assertThat(decoder.decode(token).getClaimAsString("facility")).isEqualTo(PERADENIYA);
  }

  @Test
  void aRegisteredDataProviderCanSignInAgain() throws Exception {
    register(code, "clinic@example.org", PASSWORD).andExpect(status().isCreated());

    mvc.perform(
            post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\": \"clinic@example.org\", \"password\": \"%s\"}"
                        .formatted(PASSWORD)))
        .andExpect(status().isOk());
  }

  @Test
  void refusesRegistrationWithoutAValidCode() throws Exception {
    register("KDY-AAA-AAAA", "clinic@example.org", PASSWORD)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("inviteCode"));
    register("", "clinic@example.org", PASSWORD).andExpect(status().isBadRequest());

    assertNoDataProviders();
  }

  @Test
  void refusesARevokedCode() throws Exception {
    inviteCodes.revoke(PERADENIYA);

    register(code, "clinic@example.org", PASSWORD).andExpect(status().isBadRequest());
    assertNoDataProviders();
  }

  @Test
  void refusesAShortPasswordWithoutRepeatingIt() throws Exception {
    String body =
        register(code, "clinic@example.org", "too short")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[0].field").value("password"))
            .andExpect(jsonPath("$.errors[0].message").value("must be at least 12 characters"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(body).doesNotContain("too short");
    assertNoDataProviders();
  }

  @Test
  void refusesAnAddressThatAlreadyHasAnAccount() throws Exception {
    register(code, "clinic@example.org", PASSWORD).andExpect(status().isCreated());

    register(code, "Clinic@Example.org", PASSWORD).andExpect(status().isConflict());
  }

  @Test
  void letsSeveralPeopleAtOneFacilityRegisterWithItsCode() throws Exception {
    register(code, "nurse@example.org", PASSWORD).andExpect(status().isCreated());
    register(code, "pharmacist@example.org", PASSWORD).andExpect(status().isCreated());

    assertThat(
            jdbc.queryForObject(
                "select count(*) from accounts where role = 'DATA_PROVIDER'", Long.class))
        .isEqualTo(2);
  }

  @Test
  void aBodyCannotMakeTheAccountAnInspectorOrMoveItToAnotherFacility() throws Exception {
    mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"inviteCode": "%s", "displayName": "Clinic", "email": "clinic@example.org",
                     "password": "%s", "role": "PHI", "districts": ["*"],
                     "facilityCode": "LCB0000018"}
                    """
                        .formatted(code, PASSWORD)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.account.role").value("DATA_PROVIDER"))
        .andExpect(jsonPath("$.account.facility.code").value(PERADENIYA))
        .andExpect(jsonPath("$.account.districts").isEmpty());
  }

  private ResultActions register(String inviteCode, String email, String password)
      throws Exception {
    return mvc.perform(
        post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"inviteCode": "%s", "displayName": "Clinic staff", "email": "%s",
                 "password": "%s"}
                """
                    .formatted(inviteCode, email, password)));
  }

  private void assertNoDataProviders() {
    assertThat(
            jdbc.queryForObject(
                "select count(*) from accounts where role = 'DATA_PROVIDER'", Long.class))
        .isZero();
  }
}
