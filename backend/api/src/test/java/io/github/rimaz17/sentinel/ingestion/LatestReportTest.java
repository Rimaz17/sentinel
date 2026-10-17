package io.github.rimaz17.sentinel.ingestion;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.TestReports;
import io.github.rimaz17.sentinel.reports.AgeBand;
import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import io.github.rimaz17.sentinel.reports.ReportService;
import io.github.rimaz17.sentinel.reports.SymptomGroup;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** The report feed asks when the latest stored report presented, to post only what is missing. */
@IntegrationTest
class LatestReportTest {

  private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

  @Autowired MockMvc mvc;
  @Autowired ReportService reports;
  @Autowired JdbcTemplate jdbc;
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

  @Test
  void givesWhenTheLatestReportPresentedAndNothingElse() throws Exception {
    // Stored out of order, as a backfill and a live run together would store them.
    store(30);
    store(10);
    store(20);

    mvc.perform(get("/api/ingestion/reports/latest").with(TestAccounts.asFeed()))
        .andExpect(status().isOk())
        .andExpect(
            content()
                .json("{\"reportedAt\": \"" + NOW.minus(10, ChronoUnit.MINUTES) + "\"}", true));
  }

  /** A Kandy report that presented {@code minutesAgo} minutes before the test began. */
  private void store(int minutesAgo) {
    long facilityId =
        jdbc.queryForObject("select id from facilities where code = ?", Long.class, "LKY0001016");
    reports.record(
        new AnonymisedReport(
            UUID.randomUUID(),
            facilityId,
            "KDY",
            SymptomGroup.DENGUE_LIKE,
            AgeBand.AGE_30_39,
            new BigDecimal("7.271"),
            new BigDecimal("80.596"),
            NOW.minus(minutesAgo, ChronoUnit.MINUTES),
            NOW));
  }
}
