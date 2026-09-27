package io.github.rimaz17.sentinel.facilities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * An institution allowed to submit reports. The code is the Ministry of Health's Health Institution
 * Number. Latitude and longitude are both null where the source location could not be verified.
 */
@Entity
@Table(name = "facilities")
public class Facility {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String code;

  @Column(nullable = false)
  private String name;

  @Column(name = "district_code", nullable = false)
  private String districtCode;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private FacilityCategory category;

  @Column(name = "institution_type", nullable = false)
  private String institutionType;

  private BigDecimal latitude;

  private BigDecimal longitude;

  protected Facility() {}

  public Long getId() {
    return id;
  }

  public String getCode() {
    return code;
  }

  public String getName() {
    return name;
  }

  public String getDistrictCode() {
    return districtCode;
  }

  public FacilityCategory getCategory() {
    return category;
  }

  public String getInstitutionType() {
    return institutionType;
  }

  public BigDecimal getLatitude() {
    return latitude;
  }

  public BigDecimal getLongitude() {
    return longitude;
  }
}
