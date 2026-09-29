package io.github.rimaz17.sentinel.facilities;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class FacilityControllerTest {

  @Autowired MockMvc mvc;
  @Autowired TestAccounts testAccounts;

  @Test
  void listsTheWholeRegistry() throws Exception {
    mvc.perform(get("/api/facilities").with(testAccounts.asInspector("*")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1501)));
  }

  @Test
  void filtersByDistrict() throws Exception {
    mvc.perform(get("/api/facilities").with(testAccounts.asInspector("*")).param("district", "KDY"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(109)))
        .andExpect(jsonPath("$[*].districtCode", everyItem(is("KDY"))));
  }

  @Test
  void describesAFacilityWithAVerifiedLocation() throws Exception {
    mvc.perform(get("/api/facilities").with(testAccounts.asInspector("*")).param("district", "AMP"))
        .andExpect(jsonPath("$[?(@.code == 'LAP0000059')].name").value("Ampara"))
        .andExpect(jsonPath("$[?(@.code == 'LAP0000059')].category").value("HOSPITAL"))
        .andExpect(
            jsonPath("$[?(@.code == 'LAP0000059')].institutionType").value("District General"))
        .andExpect(jsonPath("$[?(@.code == 'LAP0000059')].latitude").value(7.298334))
        .andExpect(jsonPath("$[?(@.code == 'LAP0000059')].longitude").value(81.690841));
  }

  @Test
  void leavesAnUnverifiedLocationEmpty() throws Exception {
    mvc.perform(get("/api/facilities").with(testAccounts.asInspector("*")).param("district", "ANU"))
        .andExpect(jsonPath("$[?(@.code == 'LAN0000034')]", hasSize(1)))
        .andExpect(jsonPath("$[?(@.code == 'LAN0000034')].latitude", everyItem(nullValue())))
        .andExpect(jsonPath("$[?(@.code == 'LAN0000034')].longitude", everyItem(nullValue())));
  }

  @Test
  void returnsNothingForAWellFormedDistrictThatDoesNotExist() throws Exception {
    mvc.perform(get("/api/facilities").with(testAccounts.asInspector("*")).param("district", "XYZ"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void rejectsAMalformedDistrictCode() throws Exception {
    mvc.perform(
            get("/api/facilities").with(testAccounts.asInspector("*")).param("district", "kandy"))
        .andExpect(status().isBadRequest());
  }
}
