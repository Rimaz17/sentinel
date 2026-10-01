package io.github.rimaz17.sentinel.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

class DemoPropertiesTest {

  private static final LocalTime THREE = LocalTime.of(3, 0);

  @Test
  void isOnByDefaultWithAPasswordAndCodeTheChecksAccept() throws Exception {
    MapPropertySource none = new MapPropertySource("no environment", Map.of());
    StandardEnvironment environment = new StandardEnvironment();
    environment
        .getPropertySources()
        .replace(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, none);
    new YamlPropertySourceLoader()
        .load("application", new ClassPathResource("application.yml"))
        .forEach(environment.getPropertySources()::addLast);

    DemoProperties demo = Binder.get(environment).bind("sentinel.demo", DemoProperties.class).get();

    assertThat(demo.enabled()).isTrue();
    assertThat(demo.password()).isEqualTo("sentinel-demo");
    assertThat(demo.inviteCode()).isEqualTo("CMB-DEM-7Q4X");
    assertThat(demo.resetAt()).isEqualTo(THREE);
  }

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
