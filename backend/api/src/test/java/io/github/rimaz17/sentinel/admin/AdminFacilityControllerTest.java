package io.github.rimaz17.sentinel.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.facilities.InviteCodes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class AdminFacilityControllerTest {

  /** Teaching Hospital Peradeniya, in Kandy district. */
  private static final String PERADENIYA = "LKY0001016";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired InviteCodes inviteCodes;
  @Autowired JdbcTemplate jdbc;

  private long admin;

  @BeforeEach
  void createAdministrator() {
    accounts.clear();
    admin = accounts.admin("admin@example.org", "a long admin password");
  }

  @Test
  void issuesACodeInTheFacilitysDistrictShownOnlyOnce() throws Exception {
    mvc.perform(
            post("/api/admin/facilities/" + PERADENIYA + "/invite-code").with(accounts.as(admin)))
        .andExpect(status().isCreated())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(jsonPath("$.facilityCode").value(PERADENIYA))
        .andExpect(
            jsonPath("$.inviteCode")
                .value(matchesPattern("KDY-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{4}")))
        .andExpect(jsonPath("$.issuedAt").isNotEmpty());
  }

  @Test
  void keepsOnlyAHashOfTheCode() throws Exception {
    String code = issue(PERADENIYA);

    String stored =
        jdbc.queryForObject("select code_hash from facility_invite_codes", String.class);
    assertThat(stored).doesNotContain(code).doesNotContain(code.replace("-", "")).hasSize(64);
    assertThat(jdbc.queryForObject("select issued_by from facility_invite_codes", Long.class))
        .isEqualTo(admin);
  }

  @Test
  void aCodeFindsItsFacilityHoweverItIsTyped() throws Exception {
    String code = issue(PERADENIYA);

    assertThat(inviteCodes.facilityFor(code)).get().extracting("code").isEqualTo(PERADENIYA);
    assertThat(inviteCodes.facilityFor(" " + code.toLowerCase() + " ")).isPresent();
    assertThat(inviteCodes.facilityFor(code.replace("-", ""))).isPresent();
    assertThat(inviteCodes.facilityFor("KDY-AAA-AAAA")).isEmpty();
  }

  @Test
  void issuingAgainReplacesTheOldCode() throws Exception {
    String first = issue(PERADENIYA);
    String second = issue(PERADENIYA);

    assertThat(second).isNotEqualTo(first);
    assertThat(inviteCodes.facilityFor(first)).isEmpty();
    assertThat(inviteCodes.facilityFor(second)).isPresent();
    assertThat(jdbc.queryForObject("select count(*) from facility_invite_codes", Long.class))
        .isEqualTo(1);
  }

  @Test
  void revokingStopsTheCodeWorking() throws Exception {
    String code = issue(PERADENIYA);

    mvc.perform(
            delete("/api/admin/facilities/" + PERADENIYA + "/invite-code").with(accounts.as(admin)))
        .andExpect(status().isNoContent());

    assertThat(inviteCodes.facilityFor(code)).isEmpty();
    mvc.perform(
            delete("/api/admin/facilities/" + PERADENIYA + "/invite-code").with(accounts.as(admin)))
        .andExpect(status().isNotFound());
  }

  @Test
  void refusesAFacilityThatIsNotInTheRegistry() throws Exception {
    mvc.perform(post("/api/admin/facilities/LXX9999999/invite-code").with(accounts.as(admin)))
        .andExpect(status().isNotFound());
  }

  @Test
  void listsADistrictsFacilitiesWithTheirInviteStatus() throws Exception {
    issue(PERADENIYA);
    accounts.dataProvider("clinic@example.org", "a long enough password", PERADENIYA);

    mvc.perform(get("/api/admin/facilities").param("district", "KDY").with(accounts.as(admin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(109)))
        .andExpect(jsonPath("$[*].districtCode", everyItem(is("KDY"))))
        .andExpect(jsonPath("$[?(@.code == 'LKY0001016')].inviteIssuedAt").isNotEmpty())
        .andExpect(jsonPath("$[?(@.code == 'LKY0001016')].dataProviderAccounts").value(1))
        .andExpect(jsonPath("$[?(@.code == 'LKY0001008')].inviteIssuedAt", everyItem(nullValue())))
        .andExpect(jsonPath("$[?(@.code == 'LKY0001008')].dataProviderAccounts").value(0));
  }

  @Test
  void neverListsACode() throws Exception {
    String code = issue(PERADENIYA);

    String body =
        mvc.perform(get("/api/admin/facilities").param("district", "KDY").with(accounts.as(admin)))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body).doesNotContain(code).doesNotContain("inviteCode\"");
  }

  private String issue(String facilityCode) throws Exception {
    String body =
        mvc.perform(
                post("/api/admin/facilities/" + facilityCode + "/invite-code")
                    .with(accounts.as(admin)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return JsonPath.read(body, "$.inviteCode");
  }
}
