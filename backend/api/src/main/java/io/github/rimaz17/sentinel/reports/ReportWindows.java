package io.github.rimaz17.sentinel.reports;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/**
 * The seven-day windows in Redis: one sorted set per district and symptom group, holding the id of
 * every report that presented in the last seven days, scored by when it presented, in microseconds
 * since the epoch. A district's count for any stretch of that week is a range count over its four
 * sets. See docs/adr/0015-seven-day-windows-in-redis.md.
 *
 * <p>Redis is never the only copy. A report is stored in PostgreSQL before it is added here, and
 * the windows are rebuilt from PostgreSQL whenever Redis has lost them. The key {@link #COMPLETE}
 * says they hold everything; a Redis that restarts or is emptied loses it with everything else, and
 * the next count finds it gone.
 */
@Component
class ReportWindows {

  static final Duration WINDOW = Duration.ofDays(7);

  static final String PREFIX = "sentinel:window:";

  /** Present while the windows hold every stored report of the last seven days. */
  static final String COMPLETE = PREFIX + "complete";

  /**
   * Holds the token of a rebuild under way, so the rebuild can tell if Redis was emptied meanwhile.
   */
  static final String REBUILDING = PREFIX + "rebuilding";

  /**
   * Answers whether the first key, {@link #COMPLETE}, exists, as 1 or 0, followed, if it does, by
   * the count of every other key between ARGV[1] inclusive and ARGV[2] exclusive. One script, so a
   * Redis emptied part-way through can never be half seen.
   */
  @SuppressWarnings("rawtypes")
  private static final RedisScript<List> COUNT =
      RedisScript.of(
          """
          if redis.call('EXISTS', KEYS[1]) == 0 then return {0} end
          local answer = {1}
          for i = 2, #KEYS do
            answer[i] = redis.call('ZCOUNT', KEYS[i], ARGV[1], '(' .. ARGV[2])
          end
          return answer
          """,
          List.class);

  /** Marks the windows complete if the rebuild holding token ARGV[1] was not interrupted. */
  private static final RedisScript<Long> FINISH_REBUILD =
      RedisScript.of(
          """
          if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
          redis.call('SET', KEYS[2], '1')
          redis.call('DEL', KEYS[1])
          return 1
          """,
          Long.class);

  private final StringRedisTemplate redis;

  ReportWindows(StringRedisTemplate redis) {
    this.redis = redis;
  }

  /**
   * Adds a report to its window, unless it presented too long ago to be in one, and drops whatever
   * has aged out of that window. Adding a report twice leaves it counted once.
   */
  void add(WindowEntry entry, Instant now) {
    Instant cutoff = now.minus(WINDOW);
    if (entry.reportedAt().isBefore(cutoff)) {
      return;
    }
    String key = key(entry.districtCode(), entry.symptomGroup());
    redis.opsForZSet().add(key, entry.id().toString(), score(entry.reportedAt()));
    redis.opsForZSet().removeRangeByScore(key, Double.NEGATIVE_INFINITY, score(cutoff) - 1);
  }

  /**
   * Reports per district that presented in [from, to), for each of the given districts, or empty
   * when the windows are not complete and must be rebuilt first. {@code from} must fall within the
   * last seven days.
   */
  Optional<Map<String, Long>> counts(List<String> districtCodes, Instant from, Instant to) {
    List<String> keys = new ArrayList<>();
    keys.add(COMPLETE);
    for (String districtCode : districtCodes) {
      for (SymptomGroup group : SymptomGroup.values()) {
        keys.add(key(districtCode, group));
      }
    }
    List<?> answer = redis.execute(COUNT, keys, micros(from), micros(to));
    if (((Number) answer.get(0)).longValue() == 0) {
      return Optional.empty();
    }
    Map<String, Long> counts = new HashMap<>();
    int index = 1;
    for (String districtCode : districtCodes) {
      long total = 0;
      for (int group = 0; group < SymptomGroup.values().length; group++) {
        total += ((Number) answer.get(index++)).longValue();
      }
      counts.put(districtCode, total);
    }
    return Optional.of(counts);
  }

  /**
   * Adds every entry, then marks the windows complete, unless Redis lost the rebuild's own marker
   * meanwhile: it restarted or was emptied part-way, taking some of the entries with it. The
   * windows are then left incomplete, and the next count rebuilds them again.
   */
  void rebuild(List<WindowEntry> entries) {
    String token = UUID.randomUUID().toString();
    redis.opsForValue().set(REBUILDING, token);
    redis.executePipelined(
        (RedisCallback<Object>)
            connection -> {
              for (WindowEntry entry : entries) {
                connection
                    .zSetCommands()
                    .zAdd(
                        bytes(key(entry.districtCode(), entry.symptomGroup())),
                        score(entry.reportedAt()),
                        bytes(entry.id().toString()));
              }
              return null;
            });
    redis.execute(FINISH_REBUILD, List.of(REBUILDING, COMPLETE), token);
  }

  static String key(String districtCode, SymptomGroup group) {
    return PREFIX + districtCode + ":" + group.name();
  }

  /** Microseconds since the epoch: PostgreSQL's own precision, and exact in a double. */
  private static String micros(Instant instant) {
    return String.valueOf(ChronoUnit.MICROS.between(Instant.EPOCH, instant));
  }

  private static double score(Instant instant) {
    return ChronoUnit.MICROS.between(Instant.EPOCH, instant);
  }

  private static byte[] bytes(String value) {
    return value.getBytes(StandardCharsets.UTF_8);
  }
}
