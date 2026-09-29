package io.github.rimaz17.sentinel.reports;

/**
 * A message on the reports topic that does not hold a complete anonymised report. Reading it again
 * cannot help, so it is set aside on the dead-letter topic rather than retried.
 */
public class MalformedReportMessageException extends RuntimeException {

  MalformedReportMessageException(String problem) {
    super("A report message " + problem + ".");
  }
}
