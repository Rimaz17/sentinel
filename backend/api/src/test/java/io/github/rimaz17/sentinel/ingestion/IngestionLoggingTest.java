package io.github.rimaz17.sentinel.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import io.github.rimaz17.sentinel.IntegrationTest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Nothing identifying reaches the logs, not even with the web and persistence layers logging
 * everything they can, and not even when a submission is rejected.
 */
@IntegrationTest
@ExtendWith(OutputCaptureExtension.class)
class IngestionLoggingTest {

  private static final List<String> VERBOSE =
      List.of("org.springframework.web", "org.hibernate.SQL", "org.hibernate.orm.jdbc.bind");

  private static final String NAME = "Nimali Perera";
  private static final String NIC = "198912345678";
  private static final String DATE_OF_BIRTH = "1989-04-17";
  private static final String PHONE = "0771234567";
  private static final String ADDRESS = "12 Temple Road, Kandy";

  @Autowired MockMvc mvc;

  private final LoggingSystem logging = LoggingSystem.get(getClass().getClassLoader());

  @BeforeEach
  void logEverything() {
    VERBOSE.forEach(logger -> logging.setLogLevel(logger, LogLevel.TRACE));
  }

  @AfterEach
  void restoreLevels() {
    VERBOSE.forEach(logger -> logging.setLogLevel(logger, null));
  }

  @Test
  void noIdentityExactAgeOrExactLocationIsLogged(CapturedOutput output) throws Exception {
    String valid = report();
    submit("LKY0001016", valid);
    submit("LKY0001016", valid.replace("\"latitude\": 7.2912345", "\"latitude\": 12.5"));
    submit("LKY0001016", valid.replace("\"age\": 37,", "").replace(DATE_OF_BIRTH, "17/04/1989"));
    submit("LKY0001016", valid.replace("\"age\": 37", "\"age\": \"thirty\""));
    submit("LXX9999999", valid);
    submit("LKY0001016", valid.substring(0, valid.indexOf(ADDRESS) + 5));

    assertThat(output.getAll())
        .as("verbose logging was captured, so its absence of identity means something")
        .contains("/api/ingestion/reports", "insert into reports")
        .doesNotContain(NAME, NIC, DATE_OF_BIRTH, "17/04/1989", PHONE, ADDRESS)
        .doesNotContain("7.2912345", "80.6337499");
  }

  private void submit(String facilityCode, String body) throws Exception {
    mvc.perform(
        post("/api/ingestion/reports")
            .header("X-Facility-Code", facilityCode)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body));
  }

  private static String report() {
    OffsetDateTime reportedAt =
        OffsetDateTime.now(ZoneOffset.ofHoursMinutes(5, 30))
            .minusHours(2)
            .truncatedTo(ChronoUnit.SECONDS);
    return """
        {
          "symptomGroup": "DENGUE_LIKE",
          "reportedAt": "%s",
          "age": 37,
          "latitude": 7.2912345,
          "longitude": 80.6337499,
          "patientName": "%s",
          "nicNumber": "%s",
          "dateOfBirth": "%s",
          "phoneNumber": "%s",
          "homeAddress": "%s"
        }
        """
        .formatted(reportedAt, NAME, NIC, DATE_OF_BIRTH, PHONE, ADDRESS);
  }
}
