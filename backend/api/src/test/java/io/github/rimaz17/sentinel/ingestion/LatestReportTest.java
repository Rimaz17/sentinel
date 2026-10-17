package io.github.rimaz17.sentinel.ingestion;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.TestReports;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/** The report feed asks when the latest stored report presented, to post only what is missing. */
@IntegrationTest
class LatestReportTest {

  @Autowired MockMvc mvc;
  @Autowired TestReports testReports;

  @BeforeEach
  void clear() {
    testReports.clear();
  }

  @Test
  void givesNoTimeWhenNoReportIsStored() throws Exception {
    mvc.perform(get("/api/ingestion/reports/latest").with(TestAccounts.asFeed()))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"reportedAt\": null}", true));
  }
}
