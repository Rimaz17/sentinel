package io.github.rimaz17.sentinel.accounts;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * The districts an inspector may see. National reach is written as the single entry {@code *}; an
 * empty list also reads as national, as the project's rules define it, though an account is never
 * stored that way.
 *
 * @param national whether every district is in scope
 * @param districts the district codes in scope, empty when national
 */
public record DistrictScope(boolean national, Set<String> districts) {

  public static final String EVERY_DISTRICT = "*";

  public static final DistrictScope NATIONAL = new DistrictScope(true, Set.of());

  public DistrictScope {
    districts = national ? Set.of() : Set.copyOf(districts);
  }

  public static DistrictScope of(Collection<String> entries) {
    if (entries.isEmpty() || entries.contains(EVERY_DISTRICT)) {
      return NATIONAL;
    }
    return new DistrictScope(false, Set.copyOf(entries));
  }

  public boolean includes(String districtCode) {
    return national || districts.contains(districtCode);
  }

  /** The codes a query should be limited to, or null when every district is in scope. */
  public List<String> filter() {
    return national ? null : List.copyOf(new TreeSet<>(districts));
  }

  /** The scope as it is stored and put in tokens: {@code ["*"]}, or the codes in order. */
  public List<String> entries() {
    return national ? List.of(EVERY_DISTRICT) : List.copyOf(new TreeSet<>(districts));
  }
}
