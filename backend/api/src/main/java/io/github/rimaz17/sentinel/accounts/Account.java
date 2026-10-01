package io.github.rimaz17.sentinel.accounts;

import io.github.rimaz17.sentinel.facilities.Facility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Arrays;
import java.util.Locale;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A staff account. The public has none. See the accounts migration for the rules the database holds
 * every row to: a data provider has a facility and nothing else does, and an inspector's scope is
 * never empty.
 */
@Entity
@Table(name = "accounts")
public class Account {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(name = "display_name", nullable = false)
  private String displayName;

  @Column(name = "password_hash")
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Role role;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "facility_id")
  private Facility facility;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(nullable = false)
  private String[] districts;

  @Column(nullable = false)
  private boolean enabled;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "made_in_demo", nullable = false)
  private boolean madeInDemo;

  protected Account() {}

  private Account(
      String email,
      String displayName,
      String passwordHash,
      Role role,
      Facility facility,
      DistrictScope scope,
      Instant createdAt) {
    this.email = normaliseEmail(email);
    this.displayName = displayName.strip();
    this.passwordHash = passwordHash;
    this.role = role;
    this.facility = facility;
    this.districts = scope == null ? new String[0] : scope.entries().toArray(String[]::new);
    this.enabled = true;
    this.createdAt = createdAt;
  }

  /** Staff at a facility, registered with that facility's invite code. */
  public static Account dataProvider(
      String email, String displayName, String passwordHash, Facility facility, Instant now) {
    return new Account(email, displayName, passwordHash, Role.DATA_PROVIDER, facility, null, now);
  }

  /** An inspector created by an administrator. They set a password when they activate. */
  public static Account inspector(
      String email, String displayName, DistrictScope scope, Instant now) {
    return new Account(email, displayName, null, Role.PHI, null, scope, now);
  }

  /** The administrator provisioned at setup. */
  public static Account administrator(
      String email, String displayName, String passwordHash, Instant now) {
    return new Account(email, displayName, passwordHash, Role.ADMIN, null, null, now);
  }

  /** Emails are compared and stored lower case, without surrounding space. */
  public static String normaliseEmail(String email) {
    return email.strip().toLowerCase(Locale.ROOT);
  }

  public Long getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getDisplayName() {
    return displayName;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  /** Whether the account has a password yet: an inspector has none until they activate. */
  public boolean isActivated() {
    return passwordHash != null;
  }

  public Role getRole() {
    return role;
  }

  /** The facility a data provider submits for; null for every other role. */
  public Facility getFacility() {
    return facility;
  }

  /** The districts an inspector covers. Other roles see no internal data at all. */
  public DistrictScope getScope() {
    return DistrictScope.of(Arrays.asList(districts));
  }

  public boolean isEnabled() {
    return enabled;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  /**
   * Whether a visitor to the public demonstration made this account, so the demo's nightly reset
   * removes it. See the made_in_demo migration.
   */
  public boolean isMadeInDemo() {
    return madeInDemo;
  }

  public void markMadeInDemo() {
    this.madeInDemo = true;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  /** Changes an inspector's reach. Only inspectors have a scope. */
  public void setScope(DistrictScope scope) {
    if (role != Role.PHI) {
      throw new IllegalStateException("only an inspector has a district scope");
    }
    this.districts = scope.entries().toArray(String[]::new);
  }
}
