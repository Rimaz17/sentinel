package io.github.rimaz17.sentinel.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * The public demonstration: its published accounts and invite code, what the demo administrator is
 * kept from, and the nightly reset that removes what visitors made and nothing else.
 */
@IntegrationTest
@TestPropertySource(
    properties = {
      "sentinel.demo.enabled=true",
      "sentinel.demo.password=" + DemoModeTest.DEMO_PASSWORD,
      "sentinel.demo.invite-code=" + DemoModeTest.DEMO_CODE
    })
class DemoModeTest {

  static final String DEMO_PASSWORD = "the published demo password";
  static final String DEMO_CODE = "CMB-DEM-7Q4X";

  private static final String OWNER_PASSWORD = "the owner's own password";
  private static final String PERADENIYA = "LKY0001016";
  private static final String NATIONAL_HOSPITAL = "LCB0000018";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired JdbcTemplate jdbc;
  @Autowired DemoState state;

  private long owner;
  private long demoAdmin;

  @BeforeEach
  void startFromTheDemosStartingState() {
    jdbc.update("delete from alerts");
    accounts.clear();
    owner = accounts.admin("owner@example.org", OWNER_PASSWORD);
    state.restore();
    demoAdmin = idOf(DemoAccount.ADMINISTRATOR.email());
  }

  @Test
  void publishesTheFourDemoAccountsAndTheInviteCode() throws Exception {
    mvc.perform(get("/api/public/demo"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accounts", hasSize(4)))
        .andExpect(
            jsonPath("$.accounts[*].role")
                .value(containsInAnyOrder("ADMIN", "PHI", "PHI", "DATA_PROVIDER")))
        .andExpect(jsonPath("$.accounts[2].districts[0]").value("CMB"))
        .andExpect(
            jsonPath("$.accounts[3].facilityName").value("Infectious Diseases Hospital, Angoda"))
        .andExpect(jsonPath("$.password").value(DEMO_PASSWORD))
        .andExpect(jsonPath("$.invite.code").value(DEMO_CODE))
        .andExpect(jsonPath("$.invite.districtCode").value("CMB"))
        .andExpect(jsonPath("$.resetAt").value("03:00"));
  }

  @Test
  void everyDemoAccountSignsInWithThePublishedPassword() throws Exception {
    for (DemoAccount account : DemoAccount.values()) {
      signIn(account.email(), DEMO_PASSWORD)
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.account.role").value(account.role().name()));
    }
  }

  @Test
  void theColomboInspectorIsRefusedKandy() throws Exception {
    long colombo = idOf(DemoAccount.COLOMBO_INSPECTOR.email());

    mvc.perform(get("/api/districts/KDY").with(accounts.as(colombo)))
        .andExpect(status().isForbidden());
    mvc.perform(
            get("/api/reports/weekly-counts").param("district", "KDY").with(accounts.as(colombo)))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/alerts").param("district", "KDY").with(accounts.as(colombo)))
        .andExpect(status().isForbidden());
  }

  @Test
  void theDemoCodeRegistersAtTheDemoFacilityAsAVisitor() throws Exception {
    mvc.perform(
            post("/api/auth/invite-codes/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"inviteCode\": \"cmb dem 7q4x\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.facilityCode").value(DemoAccount.FACILITY_CODE));

    register(DEMO_CODE, "visitor@example.org").andExpect(status().isCreated());

    assertThat(madeInDemo("visitor@example.org")).isTrue();
  }

  @Test
  void theDemoAdministratorCannotChangeTheDemoAccountsOrTheOwners() throws Exception {
    for (DemoAccount account : DemoAccount.values()) {
      long id = idOf(account.email());
      disable(demoAdmin, id)
          .andExpect(status().isForbidden())
          .andExpect(jsonPath("$.detail").value(DemoGuard.ACCOUNT_LOCKED));
      newLink(demoAdmin, id).andExpect(status().isForbidden());
    }
    disable(demoAdmin, owner).andExpect(status().isForbidden());
    newLink(demoAdmin, owner).andExpect(status().isForbidden());

    assertThat(jdbc.queryForObject("select bool_and(enabled) from accounts", Boolean.class))
        .isTrue();
    assertThat(jdbc.queryForObject("select count(*) from activation_tokens", Long.class)).isZero();
  }

  @Test
  void theDemoAdministratorChangesTheAccountsVisitorsMake() throws Exception {
    long visitor = createInspector(demoAdmin, "visitor.phi@example.org");

    assertThat(madeInDemo("visitor.phi@example.org")).isTrue();
    disable(demoAdmin, visitor).andExpect(status().isOk());
    newLinkAfterEnabling(visitor);
  }

  @Test
  void theOwnerChangesAnythingAndWhatTheOwnerMakesIsNotAVisitors() throws Exception {
    long colombo = idOf(DemoAccount.COLOMBO_INSPECTOR.email());

    disable(owner, colombo).andExpect(status().isOk());
    createInspector(owner, "real.phi@example.org");

    assertThat(madeInDemo("real.phi@example.org")).isFalse();
  }

  @Test
  void theAccountListMarksWhatIsLockedOnlyForTheDemoAdministrator() throws Exception {
    createInspector(demoAdmin, "visitor.phi@example.org");

    mvc.perform(get("/api/admin/accounts").with(accounts.as(demoAdmin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.email == 'visitor.phi@example.org')].lockedInDemo").value(false))
        .andExpect(jsonPath("$[?(@.email == 'owner@example.org')].lockedInDemo").value(true))
        .andExpect(
            jsonPath(
                    "$[?(@.email == '" + DemoAccount.COLOMBO_INSPECTOR.email() + "')].lockedInDemo")
                .value(true));
    mvc.perform(get("/api/admin/accounts").with(accounts.as(owner)))
        .andExpect(jsonPath("$[?(@.lockedInDemo == true)]", hasSize(0)));
  }

  @Test
  void theDemoAdministratorCannotChangeThePublishedCodeOrTheOwnersCodes() throws Exception {
    issue(owner, PERADENIYA).andExpect(status().isCreated());

    issue(demoAdmin, DemoAccount.FACILITY_CODE)
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.detail").value(DemoGuard.CODE_LOCKED));
    revoke(demoAdmin, DemoAccount.FACILITY_CODE).andExpect(status().isForbidden());
    issue(demoAdmin, PERADENIYA).andExpect(status().isForbidden());
    revoke(demoAdmin, PERADENIYA).andExpect(status().isForbidden());

    mvc.perform(
            post("/api/auth/invite-codes/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"inviteCode\": \"" + DEMO_CODE + "\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void theDemoAdministratorIssuesAndRevokesItsOwnCodes() throws Exception {
    issue(demoAdmin, NATIONAL_HOSPITAL).andExpect(status().isCreated());
    issue(demoAdmin, NATIONAL_HOSPITAL).andExpect(status().isCreated());
    revoke(demoAdmin, NATIONAL_HOSPITAL).andExpect(status().isNoContent());

    mvc.perform(get("/api/admin/facilities").param("district", "CMB").with(accounts.as(demoAdmin)))
        .andExpect(
            jsonPath("$[?(@.code == '" + DemoAccount.FACILITY_CODE + "')].lockedInDemo")
                .value(true))
        .andExpect(
            jsonPath("$[?(@.code == '" + NATIONAL_HOSPITAL + "')].lockedInDemo").value(false));
  }

  @Test
  void registeringWithACodeTheDemoAdministratorIssuedMakesAVisitor() throws Exception {
    String code = issuedCode(demoAdmin, NATIONAL_HOSPITAL);
    String ownersCode = issuedCode(owner, PERADENIYA);

    register(code, "visitor@example.org").andExpect(status().isCreated());
    register(ownersCode, "clinic@example.org").andExpect(status().isCreated());

    assertThat(madeInDemo("visitor@example.org")).isTrue();
    assertThat(madeInDemo("clinic@example.org")).isFalse();
  }

  @Test
  void theResetRemovesWhatVisitorsMadeAndNothingElse() throws Exception {
    long visitorInspector = createInspector(demoAdmin, "visitor.phi@example.org");
    register(DEMO_CODE, "visitor@example.org").andExpect(status().isCreated());
    String visitorCode = issuedCode(demoAdmin, NATIONAL_HOSPITAL);
    createInspector(owner, "real.phi@example.org");
    String ownersCode = issuedCode(owner, PERADENIYA);
    String alert = insertAlert();
    jdbc.update(
        """
        update alerts set status = 'CLOSED', verdict = 'FALSE_ALARM', verdict_at = now(),
          verdict_by = ? where code = ?
        """,
        visitorInspector,
        alert);
    disable(owner, idOf(DemoAccount.NATIONAL_INSPECTOR.email())).andExpect(status().isOk());

    state.reset();

    assertThat(exists("visitor.phi@example.org")).isFalse();
    assertThat(exists("visitor@example.org")).isFalse();
    assertThat(exists("real.phi@example.org")).isTrue();
    assertThat(exists("owner@example.org")).isTrue();
    assertThat(codeWorks(visitorCode)).isFalse();
    assertThat(codeWorks(ownersCode)).isTrue();
    assertThat(codeWorks(DEMO_CODE)).isTrue();
    assertThat(
            jdbc.queryForObject(
                "select status || ' ' || coalesce(verdict, 'none') from alerts where code = ?",
                String.class,
                alert))
        .isEqualTo("NEW none");
    signIn(DemoAccount.NATIONAL_INSPECTOR.email(), DEMO_PASSWORD).andExpect(status().isOk());
    assertThat(jdbc.queryForObject("select count(*) from accounts where made_in_demo", Long.class))
        .isZero();
  }

  @Test
  void restoringPutsBackADemoAccountsPasswordAndWithdrawsItsLinks() throws Exception {
    long colombo = idOf(DemoAccount.COLOMBO_INSPECTOR.email());
    jdbc.update("update accounts set password_hash = 'changed' where id = ?", colombo);
    newLink(owner, colombo).andExpect(status().isOk());

    state.restore();

    signIn(DemoAccount.COLOMBO_INSPECTOR.email(), DEMO_PASSWORD).andExpect(status().isOk());
    assertThat(
            jdbc.queryForObject(
                "select count(*) from activation_tokens where account_id = ?", Long.class, colombo))
        .isZero();
  }

  private ResultActions signIn(String email, String password) throws Exception {
    return mvc.perform(
        post("/api/auth/signin")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\": \"" + email + "\", \"password\": \"" + password + "\"}"));
  }

  private ResultActions register(String code, String email) throws Exception {
    return mvc.perform(
        post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"inviteCode": "%s", "displayName": "Visitor", "email": "%s",
                 "password": "a visitor's own password"}
                """
                    .formatted(code, email)));
  }

  private long createInspector(long admin, String email) throws Exception {
    mvc.perform(
            post("/api/admin/inspectors")
                .with(accounts.as(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\": \""
                        + email
                        + "\", \"displayName\": \"Visitor\", \"districts\": [\"CMB\"]}"))
        .andExpect(status().isCreated());
    return idOf(email);
  }

  private ResultActions disable(long admin, long account) throws Exception {
    return mvc.perform(
        patch("/api/admin/accounts/" + account)
            .with(accounts.as(admin))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"enabled\": false}"));
  }

  private ResultActions newLink(long admin, long account) throws Exception {
    return mvc.perform(
        post("/api/admin/accounts/" + account + "/activation").with(accounts.as(admin)));
  }

  private void newLinkAfterEnabling(long account) throws Exception {
    mvc.perform(
            patch("/api/admin/accounts/" + account)
                .with(accounts.as(demoAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\": true}"))
        .andExpect(status().isOk());
    newLink(demoAdmin, account).andExpect(status().isOk());
  }

  private ResultActions issue(long admin, String facility) throws Exception {
    return mvc.perform(
        post("/api/admin/facilities/" + facility + "/invite-code").with(accounts.as(admin)));
  }

  private ResultActions revoke(long admin, String facility) throws Exception {
    return mvc.perform(
        delete("/api/admin/facilities/" + facility + "/invite-code").with(accounts.as(admin)));
  }

  private String issuedCode(long admin, String facility) throws Exception {
    String body =
        issue(admin, facility)
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return body.replaceAll(".*\"inviteCode\":\"([^\"]+)\".*", "$1");
  }

  private boolean codeWorks(String code) throws Exception {
    return mvc.perform(
                post("/api/auth/invite-codes/check")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"inviteCode\": \"" + code + "\"}"))
            .andReturn()
            .getResponse()
            .getStatus()
        == 200;
  }

  private long idOf(String email) {
    return jdbc.queryForObject("select id from accounts where email = ?", Long.class, email);
  }

  private boolean exists(String email) {
    return jdbc.queryForObject("select count(*) from accounts where email = ?", Long.class, email)
        == 1;
  }

  private boolean madeInDemo(String email) {
    return jdbc.queryForObject(
        "select made_in_demo from accounts where email = ?", Boolean.class, email);
  }

  private String insertAlert() {
    return jdbc.queryForObject(
        """
        insert into alerts (district_code, symptom_group, first_detected_at, last_detected_at,
          observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold)
        values ('CMB', 'DENGUE_LIKE', now() - interval '3 hours', now() - interval '1 hour',
          41, 25, 5, 3.2, 3.4, 3)
        returning code
        """,
        String.class);
  }
}
