package io.github.rimaz17.sentinel.demo;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** With demo mode off, as it is unless switched on, nothing of the demo exists or refuses. */
@IntegrationTest
class DemoModeOffTest {

  private static final String PASSWORD = "a long enough password";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;

  @BeforeEach
  void clearAccounts() {
    accounts.clear();
  }

  @Test
  void publishesNothing() throws Exception {
    mvc.perform(get("/api/public/demo")).andExpect(status().isNotFound());
  }

  @Test
  void createsNoDemoAccounts() throws Exception {
    long admin = accounts.admin("owner@example.org", PASSWORD);

    mvc.perform(get("/api/admin/accounts").with(accounts.as(admin)))
        .andExpect(jsonPath("$.length()").value(1));
  }

  @Test
  void anAdministratorAtTheDemoAddressIsNotHeldBack() throws Exception {
    long lookalike = accounts.admin(DemoAccount.ADMINISTRATOR.email(), PASSWORD);
    long inspector = accounts.inspector("phi@example.org", PASSWORD, "CMB");

    mvc.perform(get("/api/admin/accounts").with(accounts.as(lookalike)))
        .andExpect(jsonPath("$[?(@.lockedInDemo == true)]").isEmpty());
    mvc.perform(
            patch("/api/admin/accounts/" + inspector)
                .with(accounts.as(lookalike))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\": false}"))
        .andExpect(status().isOk());
  }
}
