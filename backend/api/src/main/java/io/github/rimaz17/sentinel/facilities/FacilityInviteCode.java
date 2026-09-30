package io.github.rimaz17.sentinel.facilities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** A facility's invite code, stored by its hash. See the facility_invite_codes migration. */
@Entity
@Table(name = "facility_invite_codes")
class FacilityInviteCode {

  @Id
  @Column(name = "facility_id")
  private Long facilityId;

  @Column(name = "code_hash", nullable = false, unique = true)
  private String codeHash;

  @Column(name = "issued_at", nullable = false)
  private Instant issuedAt;

  @Column(name = "issued_by", nullable = false)
  private Long issuedBy;

  protected FacilityInviteCode() {}

  FacilityInviteCode(long facilityId) {
    this.facilityId = facilityId;
  }

  Long getFacilityId() {
    return facilityId;
  }

  Instant getIssuedAt() {
    return issuedAt;
  }

  Long getIssuedBy() {
    return issuedBy;
  }

  /** Replaces whatever code the facility had. */
  void reissue(String codeHash, Instant issuedAt, long issuedBy) {
    this.codeHash = codeHash;
    this.issuedAt = issuedAt;
    this.issuedBy = issuedBy;
  }
}
