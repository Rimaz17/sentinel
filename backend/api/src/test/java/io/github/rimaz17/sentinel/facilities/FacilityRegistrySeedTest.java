package io.github.rimaz17.sentinel.facilities;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.rimaz17.sentinel.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/** The seed migration loads the registry exactly as scripts/facility-registry/README.md states. */
@IntegrationTest
class FacilityRegistrySeedTest {

  @Autowired JdbcTemplate jdbc;

  @Test
  void seedsAllHospitalsAndMohOffices() {
    assertThat(count("select count(*) from facilities")).isEqualTo(1501);
    assertThat(count("select count(*) from facilities where category = 'HOSPITAL'"))
        .isEqualTo(1149);
    assertThat(count("select count(*) from facilities where category = 'MOH_OFFICE'"))
        .isEqualTo(352);
  }

  @Test
  void keepsOnlyVerifiedLocations() {
    assertThat(count("select count(*) from facilities where latitude is not null")).isEqualTo(817);
  }

  @Test
  void everyDistrictHasLocatedFacilities() {
    assertThat(count("select count(*) from districts")).isEqualTo(25);
    assertThat(
            count(
                """
                select count(*) from districts d
                where (select count(*) from facilities f
                       where f.district_code = d.code and f.latitude is not null) < 8
                """))
        .isZero();
  }

  private long count(String sql) {
    return jdbc.queryForObject(sql, Long.class);
  }
}
