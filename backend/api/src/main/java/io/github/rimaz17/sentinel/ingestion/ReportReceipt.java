package io.github.rimaz17.sentinel.ingestion;

import java.time.Instant;
import java.util.UUID;

/** Proof that a report was accepted, and the id it will be stored under. */
record ReportReceipt(UUID reportId, Instant receivedAt) {}
