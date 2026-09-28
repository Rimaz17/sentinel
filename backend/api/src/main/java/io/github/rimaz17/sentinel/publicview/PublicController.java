package io.github.rimaz17.sentinel.publicview;

import io.github.rimaz17.sentinel.publicview.PublicResponses.PublicAlert;
import io.github.rimaz17.sentinel.publicview.PublicResponses.PublicDistrict;
import io.github.rimaz17.sentinel.publicview.PublicResponses.PublicTrends;
import jakarta.validation.constraints.Pattern;
import java.time.Duration;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The public API, open to anyone. District-level aggregates, trends and published alerts only.
 * Responses may be cached for a minute, which is as fresh as a public view needs to be and spares
 * the API a scraper's traffic.
 */
@RestController
@RequestMapping("/api/public")
class PublicController {

  private static final CacheControl ONE_MINUTE =
      CacheControl.maxAge(Duration.ofMinutes(1)).cachePublic();

  private final PublicViewService view;

  PublicController(PublicViewService view) {
    this.view = view;
  }

  @GetMapping("/districts")
  ResponseEntity<List<PublicDistrict>> districts() {
    return ResponseEntity.ok().cacheControl(ONE_MINUTE).body(view.districts());
  }

  @GetMapping("/alerts")
  ResponseEntity<List<PublicAlert>> alerts() {
    return ResponseEntity.ok().cacheControl(ONE_MINUTE).body(view.alerts());
  }

  @GetMapping("/trends")
  ResponseEntity<PublicTrends> trends(
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    return ResponseEntity.ok().cacheControl(ONE_MINUTE).body(view.trends(district));
  }
}
