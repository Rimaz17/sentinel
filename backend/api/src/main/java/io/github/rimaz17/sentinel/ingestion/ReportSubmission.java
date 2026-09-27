package io.github.rimaz17.sentinel.ingestion;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.github.rimaz17.sentinel.reports.SymptomGroup;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

/**
 * A report as a facility sends it, before anonymisation.
 *
 * <p>A facility may send its record as it stands, identity included, so the identity fields are
 * accepted. They are opaque strings: never parsed by the JSON reader, never validated, and never
 * part of an error message, so no failure can echo one back or into a log. The anonymiser reads the
 * date of birth only when no age is given, turns it into an age band, and drops everything else.
 * The facility is never taken from here: it comes from the submitter's identity, and any field
 * claiming a facility or district is ignored along with every other unknown field.
 *
 * @param age exact age in years; takes precedence over {@code dateOfBirth}
 * @param latitude patient location, rounded to about 110 m before storage
 * @param dateOfBirth ISO date ({@code yyyy-mm-dd}), used only when {@code age} is absent
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ReportSubmission(
    @NotNull SymptomGroup symptomGroup,
    @NotNull OffsetDateTime reportedAt,
    @Min(0) @Max(130) Integer age,
    @DecimalMin("5.8") @DecimalMax("10.0") Double latitude,
    @DecimalMin("79.4") @DecimalMax("82.0") Double longitude,
    String patientName,
    String nicNumber,
    String dateOfBirth,
    String phoneNumber,
    String homeAddress) {

  @JsonIgnore
  @AssertTrue(message = "age or dateOfBirth is required")
  public boolean isAgeOrDateOfBirthPresent() {
    return age != null || (dateOfBirth != null && !dateOfBirth.isBlank());
  }

  @JsonIgnore
  @AssertTrue(message = "latitude and longitude must be given together")
  public boolean isLocationComplete() {
    return (latitude == null) == (longitude == null);
  }

  /** Names only what is safe to log: identity, exact age and exact location are left out. */
  @Override
  public String toString() {
    return "ReportSubmission[symptomGroup="
        + symptomGroup
        + ", reportedAt="
        + reportedAt
        + ", identity, age and location redacted]";
  }
}
