package io.github.rimaz17.sentinel.ingestion;

import java.time.Instant;

/** When the most recent stored report presented, or null when none is stored. */
record LatestReport(Instant reportedAt) {}
