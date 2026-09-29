package io.github.rimaz17.sentinel.reports;

import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * How a report travels on the reports topic: an {@link AnonymisedReport} as JSON, and nothing more.
 * Ingestion writes it and the stream processor reads it back, so the topic can only ever carry what
 * anonymisation kept.
 *
 * <p>The format has its own mapper rather than the web layer's, so a change to how the API writes
 * responses can never change what is on the topic.
 */
@Component
public class ReportMessages {

  private final JsonMapper json = JsonMapper.builder().build();

  public byte[] write(AnonymisedReport report) {
    return json.writeValueAsBytes(report);
  }

  /**
   * The report a message carries.
   *
   * @throws MalformedReportMessageException if it is not a complete anonymised report
   */
  public AnonymisedReport read(byte[] message) {
    if (message == null) {
      throw new MalformedReportMessageException("has no value");
    }
    AnonymisedReport report;
    try {
      report = json.readValue(message, AnonymisedReport.class);
    } catch (JacksonException e) {
      // The reader's message can quote the message; only the fact of the failure is kept.
      throw new MalformedReportMessageException("is not JSON of an anonymised report");
    }
    if (report == null
        || report.id() == null
        || report.facilityId() <= 0
        || report.districtCode() == null
        || report.symptomGroup() == null
        || report.ageBand() == null
        || report.reportedAt() == null
        || report.receivedAt() == null) {
      throw new MalformedReportMessageException("is missing a required field");
    }
    if ((report.latitude() == null) != (report.longitude() == null)) {
      throw new MalformedReportMessageException("has a latitude or a longitude without the other");
    }
    return report;
  }
}
