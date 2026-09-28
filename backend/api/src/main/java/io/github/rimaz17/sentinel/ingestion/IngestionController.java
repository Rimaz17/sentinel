package io.github.rimaz17.sentinel.ingestion;

import io.github.rimaz17.sentinel.accounts.Role;
import io.github.rimaz17.sentinel.auth.Caller;
import io.github.rimaz17.sentinel.web.ApiProblem;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ingestion/reports")
class IngestionController {

  /**
   * The facility a report feed is submitting for. Only the feed may name one: it submits on behalf
   * of many facilities. A data provider's facility comes from their token, and this header is
   * ignored for them. See docs/adr/0012-trusted-report-feed.md.
   */
  static final String FACILITY_HEADER = "X-Facility-Code";

  static final String FEED_NEEDS_FACILITY =
      "A report from the feed must name its facility in the X-Facility-Code header.";

  private final IngestionService ingestion;

  IngestionController(IngestionService ingestion) {
    this.ingestion = ingestion;
  }

  /** Accepted rather than created: once Kafka is in place, storage happens after the reply. */
  @PostMapping
  @ResponseStatus(HttpStatus.ACCEPTED)
  ReportReceipt submit(
      Caller caller,
      @RequestHeader(name = FACILITY_HEADER, required = false) String facilityHeader,
      @Valid @RequestBody ReportSubmission submission) {
    return ingestion.submit(facilityCode(caller, facilityHeader), submission);
  }

  /**
   * Whose report this is. A data provider's facility is fixed in their token when they sign in, so
   * no header or body field can make one facility submit as another.
   */
  private static String facilityCode(Caller caller, String facilityHeader) {
    if (caller instanceof Caller.Staff staff
        && staff.role() == Role.DATA_PROVIDER
        && staff.facilityCode() != null) {
      return staff.facilityCode();
    }
    if (caller instanceof Caller.Feed) {
      if (facilityHeader == null || facilityHeader.isBlank()) {
        throw new ApiProblem(HttpStatus.BAD_REQUEST, FEED_NEEDS_FACILITY);
      }
      return facilityHeader.strip();
    }
    throw new ApiProblem(HttpStatus.FORBIDDEN, Caller.NOT_PERMITTED);
  }
}
