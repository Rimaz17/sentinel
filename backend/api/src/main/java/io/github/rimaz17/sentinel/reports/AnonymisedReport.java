package io.github.rimaz17.sentinel.reports;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A report after the front door: everything Sentinel keeps about one patient visit, and nothing
 * else. There is no field here that could hold a name, NIC number, date of birth, phone number or
 * address, so no code downstream of ingestion can store one.
 *
 * <p>Latitude and longitude are either both present, rounded to three decimal places, or both null.
 */
public record AnonymisedReport(
    UUID id,
    long facilityId,
    String districtCode,
    SymptomGroup symptomGroup,
    AgeBand ageBand,
    BigDecimal latitude,
    BigDecimal longitude,
    Instant reportedAt,
    Instant receivedAt) {}
