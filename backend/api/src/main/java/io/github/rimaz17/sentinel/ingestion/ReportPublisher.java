package io.github.rimaz17.sentinel.ingestion;

import io.github.rimaz17.sentinel.reports.AnonymisedReport;

/**
 * Where ingestion hands a report once it is anonymised: the reports topic. Ingestion never writes
 * to storage itself; see docs/adr/0014-kafka-between-ingestion-and-storage.md.
 */
public interface ReportPublisher {

  void publish(AnonymisedReport report);
}
