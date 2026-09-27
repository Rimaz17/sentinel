package io.github.rimaz17.sentinel.facilities;

import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/facilities")
class FacilityController {

  private final FacilityService facilities;

  FacilityController(FacilityService facilities) {
    this.facilities = facilities;
  }

  @GetMapping
  List<FacilityResponse> list(
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    List<Facility> found = district == null ? facilities.all() : facilities.inDistrict(district);
    return found.stream().map(FacilityResponse::from).toList();
  }
}
