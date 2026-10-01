package io.github.rimaz17.sentinel.reports;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestReports;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/** The geographic points PostGIS keeps beside each stored location (V14 to V16). */
@IntegrationTest
class ReportPointsTest {

  @Autowired JdbcTemplate jdbc;
  @Autowired TestReports reports;

  @BeforeEach
  void clear() {
    reports.clear();
  }

  @Test
  void aLocatedReportGetsAPointAtItsStoredLocationAndAnUnlocatedOneNone() {
    insert("6.923", "79.918");
    insert(null, null);

    assertThat(
            jdbc.queryForList(
                "select coalesce(st_astext(location), 'none') from reports order by latitude",
                String.class))
        .containsExactly("POINT(79.918 6.923)", "none");
  }

  @Test
  void measuresDistanceInMetresOnTheEarth() {
    insert("6.923", "79.918");

    // To the Infectious Diseases Hospital, Angoda, whose patients these would be.
    Integer metres =
        jdbc.queryForObject(
            """
            select round(st_distance(r.location, f.location))::int
            from reports r, facilities f where f.code = 'LCB0000117'
            """,
            Integer.class);
    assertThat(metres).isBetween(50, 60);
  }

  @Test
  void everyVerifiedFacilityLocationIsAPoint() {
    assertThat(
            jdbc.queryForObject(
                "select count(*) from facilities where (location is null) <> (latitude is null)",
                Integer.class))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "select count(*) from facilities where location is not null", Integer.class))
        .isEqualTo(817);
  }

  @Test
  void bothPointsAreSpatiallyIndexed() {
    assertThat(
            jdbc.queryForList(
                """
                select indexname from pg_indexes
                where indexdef like '%USING gist (location)%' order by indexname
                """,
                String.class))
        .containsExactly("facilities_location_idx", "reports_location_idx");
  }

  private void insert(String latitude, String longitude) {
    jdbc.update(
        """
        insert into reports (id, facility_id, district_code, symptom_group, age_band, latitude,
          longitude, reported_at, received_at)
        values (gen_random_uuid(), (select id from facilities where code = 'LCB0000117'), 'CMB',
          'DENGUE_LIKE', '30-39', cast(? as numeric), cast(? as numeric), now(), now())
        """,
        latitude,
        longitude);
  }
}
