package io.github.rimaz17.sentinel.reports;

import java.time.Instant;
import java.util.Map;

/** Reports per symptom group over one week, [start, end). Every group is present. */
public record WeekCounts(Instant start, Instant end, Map<SymptomGroup, Long> counts) {}
