package io.github.rimaz17.sentinel.facilities;

import io.github.rimaz17.sentinel.web.ApiProblem;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Facility invite codes. A code reads like {@code KDY-7X2-M4QP}: the facility's district, then
 * seven characters drawn at random from an alphabet without the easily confused 0, O, 1 and I, so
 * it can be read out over the phone. Seven such characters are about 35 bits, which is plenty
 * against guessing when registration attempts are rate limited.
 */
@Service
@Transactional
public class InviteCodes {

  static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  static final String NO_SUCH_FACILITY = "No facility in the registry has this code.";
  static final String NO_CODE = "This facility has no invite code to revoke.";

  private static final SecureRandom RANDOM = new SecureRandom();

  private final FacilityInviteCodeRepository codes;
  private final FacilityRepository facilities;
  private final Clock clock;

  InviteCodes(FacilityInviteCodeRepository codes, FacilityRepository facilities, Clock clock) {
    this.codes = codes;
    this.facilities = facilities;
    this.clock = clock;
  }

  /** A code shown to the administrator this once. Only its hash is kept. */
  public record IssuedCode(String facilityCode, String inviteCode, Instant issuedAt) {}

  /** Issues a facility a new code, replacing any it had. */
  public IssuedCode issue(String facilityCode, long administratorId) {
    Facility facility =
        facilities
            .findByCode(facilityCode)
            .orElseThrow(() -> new ApiProblem(HttpStatus.NOT_FOUND, NO_SUCH_FACILITY));
    String code = generate(facility.getDistrictCode());
    Instant now = clock.instant();
    FacilityInviteCode row =
        codes.findById(facility.getId()).orElseGet(() -> new FacilityInviteCode(facility.getId()));
    row.reissue(hash(code), now, administratorId);
    codes.save(row);
    return new IssuedCode(facility.getCode(), code, now);
  }

  /** Stops a facility's code working. Accounts already registered with it are untouched. */
  public void revoke(String facilityCode) {
    Facility facility =
        facilities
            .findByCode(facilityCode)
            .orElseThrow(() -> new ApiProblem(HttpStatus.NOT_FOUND, NO_SUCH_FACILITY));
    FacilityInviteCode row =
        codes
            .findById(facility.getId())
            .orElseThrow(() -> new ApiProblem(HttpStatus.NOT_FOUND, NO_CODE));
    codes.delete(row);
  }

  /** The facility a code belongs to, however the person typed its case, spaces and dashes. */
  @Transactional(readOnly = true)
  public Optional<Facility> facilityFor(String inviteCode) {
    if (inviteCode == null) {
      return Optional.empty();
    }
    return codes
        .findByCodeHash(hash(inviteCode))
        .flatMap(row -> facilities.findById(row.getFacilityId()));
  }

  /** When each facility with a code was issued it, by facility id. */
  @Transactional(readOnly = true)
  public Map<Long, Instant> issuedAtByFacility(List<Long> facilityIds) {
    return codes.findAllById(facilityIds).stream()
        .collect(
            Collectors.toMap(FacilityInviteCode::getFacilityId, FacilityInviteCode::getIssuedAt));
  }

  static String generate(String districtCode) {
    StringBuilder code = new StringBuilder(districtCode).append('-');
    for (int i = 0; i < 7; i++) {
      if (i == 3) {
        code.append('-');
      }
      code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
    }
    return code.toString();
  }

  /** Case, spaces and dashes do not matter, so the hash is taken of the letters alone. */
  static String hash(String inviteCode) {
    String letters = inviteCode.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(letters.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("every Java runtime provides SHA-256", e);
    }
  }
}
