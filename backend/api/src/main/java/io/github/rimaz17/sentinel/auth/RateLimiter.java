package io.github.rimaz17.sentinel.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Counts requests per key in fixed one-minute windows. Kept in memory: a restart forgets every
 * count, and two API instances would count separately, both acceptable for one instance of a
 * demonstration system. A shared store is the change a second instance would need.
 */
final class RateLimiter {

  static final Duration WINDOW = Duration.ofMinutes(1);

  /** Past this many keys, windows that have ended are swept out, so the map cannot grow forever. */
  private static final int SWEEP_AT = 10_000;

  private record Window(long start, int count) {}

  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
  private final Clock clock;

  RateLimiter(Clock clock) {
    this.clock = clock;
  }

  /**
   * Counts one request against {@code key}. Returns zero if it is within {@code limit} for the
   * current window, or otherwise the seconds until the window ends.
   */
  long acquire(String key, int limit) {
    Instant now = clock.instant();
    long start = now.getEpochSecond() / WINDOW.toSeconds() * WINDOW.toSeconds();
    if (windows.size() > SWEEP_AT) {
      windows.values().removeIf(window -> window.start() < start);
    }
    Window window =
        windows.compute(
            key,
            (k, current) ->
                current == null || current.start() != start
                    ? new Window(start, 1)
                    : new Window(start, current.count() + 1));
    return window.count() <= limit
        ? 0
        : Math.max(1, start + WINDOW.toSeconds() - now.getEpochSecond());
  }
}
