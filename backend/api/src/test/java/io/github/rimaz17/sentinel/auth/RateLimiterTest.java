package io.github.rimaz17.sentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

  private final MovableClock clock = new MovableClock(Instant.parse("2026-09-28T10:00:15Z"));
  private final RateLimiter limiter = new RateLimiter(clock);

  @Test
  void allowsTheLimitThenSaysHowLongToWait() {
    assertThat(limiter.acquire("a", 2)).isZero();
    assertThat(limiter.acquire("a", 2)).isZero();

    assertThat(limiter.acquire("a", 2)).isEqualTo(45);
  }

  @Test
  void countsEachKeyApart() {
    limiter.acquire("a", 1);

    assertThat(limiter.acquire("b", 1)).isZero();
  }

  @Test
  void startsAgainWithTheNextMinute() {
    limiter.acquire("a", 1);
    assertThat(limiter.acquire("a", 1)).isPositive();

    clock.now = Instant.parse("2026-09-28T10:01:00Z");

    assertThat(limiter.acquire("a", 1)).isZero();
  }

  private static final class MovableClock extends Clock {
    private Instant now;

    MovableClock(Instant now) {
      this.now = now;
    }

    @Override
    public Instant instant() {
      return now;
    }

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }
  }
}
