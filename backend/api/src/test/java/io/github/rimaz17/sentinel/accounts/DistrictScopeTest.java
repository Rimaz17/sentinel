package io.github.rimaz17.sentinel.accounts;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class DistrictScopeTest {

  @Test
  void readsTheWildcardAsNational() {
    DistrictScope scope = DistrictScope.of(List.of("*"));

    assertThat(scope.national()).isTrue();
    assertThat(scope.includes("KDY")).isTrue();
    assertThat(scope.includes("JAF")).isTrue();
    assertThat(scope.filter()).isNull();
    assertThat(scope.entries()).containsExactly("*");
  }

  @Test
  void readsAnEmptyListAsNationalAsTheRulesDefineIt() {
    assertThat(DistrictScope.of(List.of()).national()).isTrue();
  }

  @Test
  void aWildcardAmongDistrictsIsStillNational() {
    assertThat(DistrictScope.of(List.of("KDY", "*")).national()).isTrue();
  }

  @Test
  void aDistrictScopeIncludesOnlyItsOwnDistricts() {
    DistrictScope scope = DistrictScope.of(List.of("KDY"));

    assertThat(scope.national()).isFalse();
    assertThat(scope.includes("KDY")).isTrue();
    assertThat(scope.includes("CMB")).isFalse();
    assertThat(scope.filter()).containsExactly("KDY");
  }

  @Test
  void listsSeveralDistrictsInOrder() {
    DistrictScope scope = DistrictScope.of(List.of("MTL", "KDY", "NEL"));

    assertThat(scope.entries()).containsExactly("KDY", "MTL", "NEL");
    assertThat(scope.filter()).containsExactly("KDY", "MTL", "NEL");
  }
}
