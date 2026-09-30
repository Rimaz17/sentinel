package io.github.rimaz17.sentinel.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalTime;
import org.junit.jupiter.api.Test;

class DemoPropertiesTest {

  private static final LocalTime THREE = LocalTime.of(3, 0);

  @Test
  void asksForNothingWhileTheDemoIsOff() {
    assertThat(new DemoProperties(false, null, null, THREE).enabled()).isFalse();
  }

  @Test
  void refusesToStartTheDemoWithAShortPassword() {
    assertThatThrownBy(() -> new DemoProperties(true, "short", "CMB-DEM-7Q4X", THREE))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("SENTINEL_DEMO_PASSWORD");
  }

  @Test
  void refusesToStartTheDemoWithoutAnInviteCodeShapedLikeOne() {
    for (String code : new String[] {null, "", "CMB-DEM", "not a code at all"}) {
      assertThatThrownBy(() -> new DemoProperties(true, "a long enough password", code, THREE))
          .hasMessageContaining("SENTINEL_DEMO_INVITE_CODE");
    }
  }

  @Test
  void acceptsACodeWithOrWithoutDashes() {
    assertThat(
            new DemoProperties(true, "a long enough password", " CMBDEM7Q4X ", THREE).inviteCode())
        .isEqualTo("CMBDEM7Q4X");
  }
}
