package io.github.rimaz17.sentinel.ingestion;

/** The submitter's facility code does not match any facility in the registry. */
public class UnknownFacilityException extends RuntimeException {

  UnknownFacilityException() {
    super("No registered facility has this code.");
  }
}
