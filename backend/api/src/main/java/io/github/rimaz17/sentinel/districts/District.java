package io.github.rimaz17.sentinel.districts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * One of Sri Lanka's 25 administrative districts. The list is fixed by migration and never written
 * by the application. The code is Sentinel's own three-letter shorthand, such as KDY for Kandy.
 */
@Entity
@Immutable
@Table(name = "districts")
public class District {

  @Id private String code;

  @Column(nullable = false, unique = true)
  private String name;

  @Column(nullable = false)
  private String province;

  protected District() {}

  public String getCode() {
    return code;
  }

  public String getName() {
    return name;
  }

  public String getProvince() {
    return province;
  }
}
