package io.github.rimaz17.sentinel.ingestion;

import io.github.rimaz17.sentinel.reports.AnonymisedReport;

/**
 * Where ingestion hands a report once it is anonymised. Ingestion never writes to storage itself;
 * see docs/adr/0005-ingestion-stores-directly-until-kafka.md.
 */
public interface ReportPublisher {

  void publish(AnonymisedReport report);
}
