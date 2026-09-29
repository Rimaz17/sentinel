package io.github.rimaz17.sentinel.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.TestReports;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class IngestionControllerTest {

  /** Teaching Hospital Peradeniya, in Kandy district. */
  private static final String KANDY_FACILITY = "LKY0001016";

  /** The National Hospital of Sri Lanka, in Colombo district. */
  private static final String COLOMBO_FACILITY = "LCB0000018";

  private static final String NAME = "Nimali Perera";
  private static final String NIC = "198912345678";
  private static final String DATE_OF_BIRTH = "1989-04-17";
  private static final String PHONE = "0771234567";
  private static final String ADDRESS = "12 Temple Road, Kandy";

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired TestAccounts accounts;
  @Autowired TestReports testReports;

  @BeforeEach
  void clear() {
    testReports.clear();
    accounts.clear();
  }

  @Test
  void acceptsAReportAndStoresItAnonymised() throws Exception {
    MvcResult result =
        submit(KANDY_FACILITY, report(hoursAgo(2)))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.reportId", notNullValue()))
            .andExpect(jsonPath("$.receivedAt", notNullValue()))
            .andReturn();

    Map<String, Object> row = storedRow(result);
    assertThat(row.get("district_code")).isEqualTo("KDY");
    assertThat(row.get("symptom_group")).isEqualTo("DENGUE_LIKE");
    assertThat(row.get("age_band")).isEqualTo("30-39");
    assertThat(row.get("latitude")).isEqualTo(new BigDecimal("7.291"));
    assertThat(row.get("longitude")).isEqualTo(new BigDecimal("80.634"));
  }

  @Test
  void storesNoIdentityFieldExactAgeOrExactLocation() throws Exception {
    MvcResult result =
        submit(KANDY_FACILITY, report(hoursAgo(2))).andExpect(status().isAccepted()).andReturn();

    String row =
        jdbc.queryForObject(
            "select row_to_json(r)::text from reports r where id = ?",
            String.class,
            awaitStored(result));
    assertThat(row)
        .doesNotContain(NAME, NIC, DATE_OF_BIRTH, PHONE, ADDRESS, "7.2912345", "80.6337499")
        .doesNotContain("\"age\"");
  }

  @Test
  void takesTheFeedsFacilityFromItsHeaderNeverFromTheBody() throws Exception {
    String claimingColombo =
        report(hoursAgo(2))
            .replace(
                "{", "{\"facilityCode\": \"" + COLOMBO_FACILITY + "\", \"districtCode\": \"CMB\",");

    MvcResult result =
        submit(KANDY_FACILITY, claimingColombo).andExpect(status().isAccepted()).andReturn();

    Map<String, Object> row =
        jdbc.queryForMap(
            "select f.code, r.district_code from reports r join facilities f on f.id = r.facility_id"
                + " where r.id = ?",
            awaitStored(result));
    assertThat(row.get("code")).isEqualTo(KANDY_FACILITY);
    assertThat(row.get("district_code")).isEqualTo("KDY");
  }

  @Test
  void derivesAnAgeBandFromADateOfBirthWhenNoAgeIsGiven() throws Exception {
    MvcResult result =
        submit(KANDY_FACILITY, report(hoursAgo(2)).replace("\"age\": 37,", ""))
            .andExpect(status().isAccepted())
            .andReturn();

    assertThat(storedRow(result).get("age_band")).isEqualTo("30-39");
  }

  @Test
  void acceptsAReportWithoutALocation() throws Exception {
    String withoutLocation =
        report(hoursAgo(2))
            .replace("\"latitude\": 7.2912345,", "")
            .replace("\"longitude\": 80.6337499,", "");

    MvcResult result =
        submit(KANDY_FACILITY, withoutLocation).andExpect(status().isAccepted()).andReturn();

    assertThat(storedRow(result).get("latitude")).isNull();
  }

  @Test
  void refusesAFeedSubmissionThatNamesNoFacility() throws Exception {
    mvc.perform(
            post("/api/ingestion/reports")
                .header(TestAccounts.FEED_KEY_HEADER, TestAccounts.FEED_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(report(hoursAgo(2))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value(IngestionController.FEED_NEEDS_FACILITY));

    assertNothingStored();
  }

  @Test
  void storesADataProvidersReportUnderTheFacilityInTheirToken() throws Exception {
    long provider = accounts.dataProvider("clinic@example.org", "a long password", KANDY_FACILITY);
    String claimingColombo =
        report(hoursAgo(2))
            .replace(
                "{", "{\"facilityCode\": \"" + COLOMBO_FACILITY + "\", \"districtCode\": \"CMB\",");

    MvcResult result =
        mvc.perform(
                post("/api/ingestion/reports")
                    .header(HttpHeaders.AUTHORIZATION, accounts.bearer(provider))
                    .header("X-Facility-Code", COLOMBO_FACILITY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(claimingColombo))
            .andExpect(status().isAccepted())
            .andReturn();

    Map<String, Object> row =
        jdbc.queryForMap(
            "select f.code, r.district_code from reports r join facilities f on f.id = r.facility_id"
                + " where r.id = ?",
            awaitStored(result));
    assertThat(row.get("code")).isEqualTo(KANDY_FACILITY);
    assertThat(row.get("district_code")).isEqualTo("KDY");
  }

  @Test
  void refusesAnAnonymousSubmission() throws Exception {
    mvc.perform(
            post("/api/ingestion/reports")
                .header("X-Facility-Code", KANDY_FACILITY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(report(hoursAgo(2))))
        .andExpect(status().isUnauthorized());

    assertNothingStored();
  }

  @Test
  void refusesAWrongFeedKey() throws Exception {
    mvc.perform(
            post("/api/ingestion/reports")
                .header(TestAccounts.FEED_KEY_HEADER, "not-the-key-" + TestAccounts.FEED_KEY)
                .header("X-Facility-Code", KANDY_FACILITY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(report(hoursAgo(2))))
        .andExpect(status().isUnauthorized());

    assertNothingStored();
  }

  @Test
  void refusesAnInspectorOrAnAdministrator() throws Exception {
    long inspector = accounts.inspector("phi@example.org", "a long password", "*");
    long admin = accounts.admin("admin@example.org", "a long password");

    for (long account : new long[] {inspector, admin}) {
      mvc.perform(
              post("/api/ingestion/reports")
                  .header(HttpHeaders.AUTHORIZATION, accounts.bearer(account))
                  .header("X-Facility-Code", KANDY_FACILITY)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(report(hoursAgo(2))))
          .andExpect(status().isForbidden());
    }

    assertNothingStored();
  }

  @Test
  void refusesAFacilityThatIsNotInTheRegistry() throws Exception {
    submit("LXX9999999", report(hoursAgo(2)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.detail").value("No registered facility has this code."));

    assertNothingStored();
  }

  @Test
  void namesAnInvalidFieldWithoutRepeatingAnythingSubmitted() throws Exception {
    MvcResult result =
        submit(KANDY_FACILITY, report(hoursAgo(2)).replace("7.2912345", "12.5"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors", hasSize(1)))
            .andExpect(jsonPath("$.errors[0].field").value("latitude"))
            .andReturn();

    assertThat(result.getResponse().getContentAsString())
        .doesNotContain(NAME, NIC, DATE_OF_BIRTH, PHONE, ADDRESS, "12.5");
    assertNothingStored();
  }

  @Test
  void requiresAnAgeOrADateOfBirth() throws Exception {
    String ageless =
        report(hoursAgo(2))
            .replace("\"age\": 37,", "")
            .replace("\"dateOfBirth\": \"" + DATE_OF_BIRTH + "\",", "");

    submit(KANDY_FACILITY, ageless)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("ageOrDateOfBirthPresent"))
        .andExpect(jsonPath("$.errors[0].message").value("age or dateOfBirth is required"));
  }

  @Test
  void requiresLatitudeAndLongitudeTogether() throws Exception {
    submit(KANDY_FACILITY, report(hoursAgo(2)).replace("\"longitude\": 80.6337499,", ""))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("locationComplete"));
  }

  @Test
  void refusesAReportFromTheFuture() throws Exception {
    submit(KANDY_FACILITY, report(hoursAgo(-1)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("reportedAt"))
        .andExpect(jsonPath("$.errors[0].message").value("must not be in the future"));
  }

  @Test
  void refusesAReportOlderThanAYear() throws Exception {
    submit(KANDY_FACILITY, report(hoursAgo(367 * 24)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].message").value("must be within the last 366 days"));
  }

  @Test
  void refusesAMalformedDateOfBirthWithoutRepeatingIt() throws Exception {
    MvcResult result =
        submit(
                KANDY_FACILITY,
                report(hoursAgo(2))
                    .replace("\"age\": 37,", "")
                    .replace(DATE_OF_BIRTH, "17/04/1989"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[0].field").value("dateOfBirth"))
            .andReturn();

    assertThat(result.getResponse().getContentAsString()).doesNotContain("17/04/1989");
  }

  @Test
  void namesAFieldOfTheWrongTypeWithoutRepeatingIt() throws Exception {
    MvcResult result =
        submit(KANDY_FACILITY, report(hoursAgo(2)).replace("\"age\": 37", "\"age\": \"thirty\""))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[0].field").value("age"))
            .andReturn();

    assertThat(result.getResponse().getContentAsString()).doesNotContain("thirty", NAME);
  }

  @Test
  void refusesAnUnknownSymptomGroup() throws Exception {
    submit(KANDY_FACILITY, report(hoursAgo(2)).replace("DENGUE_LIKE", "CHOLERA"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("symptomGroup"));
  }

  @Test
  void refusesABodyThatIsNotJson() throws Exception {
    submit(KANDY_FACILITY, "{\"patientName\": \"" + NAME + "\",")
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.detail").value("The request body is not JSON of the expected shape."));
  }

  private ResultActions submit(String facilityCode, String body) throws Exception {
    return mvc.perform(
        post("/api/ingestion/reports")
            .header(TestAccounts.FEED_KEY_HEADER, TestAccounts.FEED_KEY)
            .header("X-Facility-Code", facilityCode)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body));
  }

  private static String report(OffsetDateTime reportedAt) {
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

  private static OffsetDateTime hoursAgo(long hours) {
    return OffsetDateTime.now(ZoneOffset.ofHoursMinutes(5, 30))
        .minusHours(hours)
        .truncatedTo(ChronoUnit.SECONDS);
  }

  private static UUID reportId(MvcResult result) throws Exception {
    String body = result.getResponse().getContentAsString();
    return UUID.fromString(body.replaceAll(".*\"reportId\":\"([^\"]+)\".*", "$1"));
  }

  /** The id of an accepted report, once the stream processor has stored it. */
  private UUID awaitStored(MvcResult result) throws Exception {
    UUID id = reportId(result);
    await()
        .atMost(Duration.ofSeconds(30))
        .until(
            () ->
                jdbc.queryForObject("select count(*) from reports where id = ?", Long.class, id)
                    == 1);
    return id;
  }

  private Map<String, Object> storedRow(MvcResult result) throws Exception {
    return jdbc.queryForMap("select * from reports where id = ?", awaitStored(result));
  }

  /** Nothing is stored even once everything on the stream has been. */
  private void assertNothingStored() {
    testReports.awaitStreamStored();
    assertThat(jdbc.queryForObject("select count(*) from reports", Long.class)).isZero();
  }
}
