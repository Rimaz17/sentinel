package io.github.rimaz17.sentinel.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.rimaz17.sentinel.reports.AgeBand;
import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import io.github.rimaz17.sentinel.reports.SymptomGroup;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class AnonymiserTest {

  private static final Instant RECEIVED = Instant.parse("2026-09-27T06:00:00Z");

  private final Anonymiser anonymiser = new Anonymiser();

  @Test
  void keepsTheFacilityAndDistrictItIsGivenAndTheReportTime() {
    AnonymisedReport report = anonymise(submission().build());

    assertThat(report.facilityId()).isEqualTo(42L);
    assertThat(report.districtCode()).isEqualTo("KDY");
    assertThat(report.symptomGroup()).isEqualTo(SymptomGroup.DENGUE_LIKE);
    assertThat(report.reportedAt()).isEqualTo(Instant.parse("2026-09-27T04:30:00Z"));
    assertThat(report.receivedAt()).isEqualTo(RECEIVED);
    assertThat(report.id()).isNotNull();
  }

  @Test
  void roundsLocationToThreeDecimalPlaces() {
    AnonymisedReport report =
        anonymise(submission().latitude(7.2912345).longitude(80.6337499).build());

    assertThat(report.latitude()).isEqualTo(new BigDecimal("7.291"));
    assertThat(report.longitude()).isEqualTo(new BigDecimal("80.634"));
  }

  @Test
  void roundsAHalfAwayFromZero() {
    AnonymisedReport report = anonymise(submission().latitude(7.2915).longitude(80.6325).build());

    assertThat(report.latitude()).isEqualTo(new BigDecimal("7.292"));
    assertThat(report.longitude()).isEqualTo(new BigDecimal("80.633"));
  }

  @Test
  void leavesAMissingLocationMissing() {
    AnonymisedReport report = anonymise(submission().latitude(null).longitude(null).build());

    assertThat(report.latitude()).isNull();
    assertThat(report.longitude()).isNull();
  }

  @Test
  void keepsAgeOnlyAsATenYearBand() {
    assertThat(anonymise(submission().age(37).build()).ageBand()).isEqualTo(AgeBand.AGE_30_39);
  }

  @Test
  void prefersTheGivenAgeToADateOfBirth() {
    AnonymisedReport report = anonymise(submission().age(37).dateOfBirth("1950-01-01").build());

    assertThat(report.ageBand()).isEqualTo(AgeBand.AGE_30_39);
  }

  @Test
  void ignoresAMalformedDateOfBirthWhenAnAgeIsGiven() {
    AnonymisedReport report = anonymise(submission().age(37).dateOfBirth("not a date").build());

    assertThat(report.ageBand()).isEqualTo(AgeBand.AGE_30_39);
  }

  @Test
  void derivesTheBandFromADateOfBirthOnTheDayOfTheReport() {
    // Reported 27 September; the patient turns 40 the next day.
    AnonymisedReport report = anonymise(submission().age(null).dateOfBirth("1986-09-28").build());

    assertThat(report.ageBand()).isEqualTo(AgeBand.AGE_30_39);
  }

  @Test
  void reckonsTheDayOfTheReportInSriLankaTime() {
    // 20:00 UTC on the 27th is 01:30 on the 28th in Colombo: the fortieth birthday.
    AnonymisedReport report =
        anonymise(
            submission()
                .age(null)
                .dateOfBirth("1986-09-28")
                .reportedAt(OffsetDateTime.parse("2026-09-27T20:00:00Z"))
                .build());

    assertThat(report.ageBand()).isEqualTo(AgeBand.AGE_40_49);
  }

  @Test
  void refusesAMalformedDateOfBirthWithoutQuotingIt() {
    assertThatThrownBy(() -> anonymise(submission().age(null).dateOfBirth("17/04/1990").build()))
        .isInstanceOfSatisfying(
            InvalidReportException.class,
            e -> {
              assertThat(e.getField()).isEqualTo("dateOfBirth");
              assertThat(e.getMessage()).doesNotContain("17/04/1990");
            });
  }

  @Test
  void refusesADateOfBirthAfterTheReport() {
    assertThatThrownBy(() -> anonymise(submission().age(null).dateOfBirth("2026-10-01").build()))
        .isInstanceOf(InvalidReportException.class)
        .hasMessage("must not be after reportedAt");
  }

  @Test
  void refusesADateOfBirthGivingAnImpossibleAge() {
    assertThatThrownBy(() -> anonymise(submission().age(null).dateOfBirth("1890-01-01").build()))
        .isInstanceOf(InvalidReportException.class)
        .hasMessage("must give an age of 130 or under");
  }

  private AnonymisedReport anonymise(ReportSubmission submission) {
    return anonymiser.anonymise(submission, 42L, "KDY", RECEIVED);
  }

  static SubmissionBuilder submission() {
    return new SubmissionBuilder();
  }

  /** A complete, valid submission with every identity field filled in. */
  static final class SubmissionBuilder {
    private SymptomGroup symptomGroup = SymptomGroup.DENGUE_LIKE;
    private OffsetDateTime reportedAt = OffsetDateTime.parse("2026-09-27T10:00:00+05:30");
    private Integer age = 37;
    private Double latitude = 7.2912345;
    private Double longitude = 80.6337499;
    private String dateOfBirth = "1989-04-17";

    SubmissionBuilder age(Integer age) {
      this.age = age;
      return this;
    }

    SubmissionBuilder dateOfBirth(String dateOfBirth) {
      this.dateOfBirth = dateOfBirth;
      return this;
    }

    SubmissionBuilder latitude(Double latitude) {
      this.latitude = latitude;
      return this;
    }

    SubmissionBuilder longitude(Double longitude) {
      this.longitude = longitude;
      return this;
    }

    SubmissionBuilder reportedAt(OffsetDateTime reportedAt) {
      this.reportedAt = reportedAt;
      return this;
    }

    ReportSubmission build() {
      return new ReportSubmission(
          symptomGroup,
          reportedAt,
          age,
          latitude,
          longitude,
          "Nimali Perera",
          "198912345678",
          dateOfBirth,
          "0771234567",
          "12 Temple Road, Kandy");
    }
  }
}
