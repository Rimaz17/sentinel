package io.github.rimaz17.sentinel.ingestion;

import io.github.rimaz17.sentinel.reports.AgeBand;
import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * The front door's privacy rules. Name, NIC number, date of birth, phone number and address are
 * dropped; exact age becomes a ten-year band; exact location is rounded to three decimal places,
 * about 110 m in Sri Lanka.
 */
@Component
public class Anonymiser {

  /** Ages from a date of birth are reckoned on the local calendar date of the report. */
  static final ZoneId SRI_LANKA = ZoneId.of("Asia/Colombo");

  private static final int LOCATION_DECIMALS = 3;
  private static final int OLDEST_AGE = 130;

  public AnonymisedReport anonymise(
      ReportSubmission submission, long facilityId, String districtCode, Instant receivedAt) {
    Instant reportedAt = submission.reportedAt().toInstant();
    return new AnonymisedReport(
        UUID.randomUUID(),
        facilityId,
        districtCode,
        submission.symptomGroup(),
        ageBand(submission, reportedAt),
        round(submission.latitude()),
        round(submission.longitude()),
        reportedAt,
        receivedAt);
  }

  private static AgeBand ageBand(ReportSubmission submission, Instant reportedAt) {
    if (submission.age() != null) {
      return AgeBand.ofAge(submission.age());
    }
    LocalDate born = dateOfBirth(submission.dateOfBirth());
    LocalDate reportedOn = reportedAt.atZone(SRI_LANKA).toLocalDate();
    if (born.isAfter(reportedOn)) {
      throw new InvalidReportException("dateOfBirth", "must not be after reportedAt");
    }
    int years = Period.between(born, reportedOn).getYears();
    if (years > OLDEST_AGE) {
      throw new InvalidReportException("dateOfBirth", "must give an age of 130 or under");
    }
    return AgeBand.ofAge(years);
  }

  private static LocalDate dateOfBirth(String text) {
    try {
      return LocalDate.parse(text.strip());
    } catch (DateTimeParseException e) {
      // The parser's message quotes the input, so it is not passed on.
      throw new InvalidReportException("dateOfBirth", "must be a date in the form yyyy-mm-dd");
    }
  }

  private static BigDecimal round(Double degrees) {
    return degrees == null
        ? null
        : BigDecimal.valueOf(degrees).setScale(LOCATION_DECIMALS, RoundingMode.HALF_UP);
  }
}
