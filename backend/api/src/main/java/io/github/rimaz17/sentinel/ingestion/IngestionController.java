package io.github.rimaz17.sentinel.ingestion;

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
   * Who is submitting. Until sign-in exists this header is the submitter's identity; afterwards it
   * is replaced by the facility claim in their token. See
   * docs/adr/0004-facility-identity-from-a-header-until-sign-in.md.
   */
  static final String FACILITY_HEADER = "X-Facility-Code";

  private final IngestionService ingestion;

  IngestionController(IngestionService ingestion) {
    this.ingestion = ingestion;
  }

  /** Accepted rather than created: once Kafka is in place, storage happens after the reply. */
  @PostMapping
  @ResponseStatus(HttpStatus.ACCEPTED)
  ReportReceipt submit(
      @RequestHeader(FACILITY_HEADER) String facilityCode,
      @Valid @RequestBody ReportSubmission submission) {
    return ingestion.submit(facilityCode, submission);
  }
}
