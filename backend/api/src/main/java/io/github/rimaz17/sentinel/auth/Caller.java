package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.DistrictScope;
import io.github.rimaz17.sentinel.accounts.Role;
import io.github.rimaz17.sentinel.web.ApiProblem;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Who is making a request, as a controller needs to know it. A controller method takes a {@code
 * Caller} parameter and receives the signed-in person or the report feed; it never reads a request
 * header or body to find out.
 */
public sealed interface Caller {

  String OUT_OF_SCOPE = "Your account does not cover this district.";
  String NOT_PERMITTED = "Your account may not use this part of the API.";

  /** The districts this caller may see. */
  DistrictScope scope();

  /** Refuses with 403 unless the district is in this caller's scope. */
  default void requireDistrict(String districtCode) {
    if (!scope().includes(districtCode)) {
      throw new ApiProblem(HttpStatus.FORBIDDEN, OUT_OF_SCOPE);
    }
  }

  /**
   * The districts a query should cover: the one asked for, which must be in scope, or everything in
   * scope when none is. Null means every district.
   */
  default List<String> districtsFor(String requestedDistrict) {
    if (requestedDistrict != null) {
      requireDistrict(requestedDistrict);
      return List.of(requestedDistrict);
    }
    return scope().filter();
  }

  /**
   * A signed-in person, as their access token describes them.
   *
   * @param facilityCode a data provider's facility; null for other roles
   */
  record Staff(long accountId, Role role, DistrictScope scope, String facilityCode)
      implements Caller {

    static Staff from(Jwt jwt) {
      Role role = Role.valueOf(jwt.getClaimAsString(AccessTokens.ROLE_CLAIM));
      List<String> districts = jwt.getClaimAsStringList(AccessTokens.DISTRICTS_CLAIM);
      // Only an inspector's token names districts, and it always does. Anything else reaches no
      // district: an absent claim must never be read as the national scope an empty list means.
      DistrictScope scope =
          role == Role.PHI && districts != null && !districts.isEmpty()
              ? DistrictScope.of(districts)
              : DistrictScope.NONE;
      return new Staff(
          Long.parseLong(jwt.getSubject()),
          role,
          scope,
          jwt.getClaimAsString(AccessTokens.FACILITY_CLAIM));
    }
  }

  /** The trusted report feed, which submits for any facility and reads the whole registry. */
  record Feed() implements Caller {

    @Override
    public DistrictScope scope() {
      return DistrictScope.NATIONAL;
    }
  }
}
