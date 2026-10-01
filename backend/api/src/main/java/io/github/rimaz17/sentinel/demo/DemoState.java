package io.github.rimaz17.sentinel.demo;

import io.github.rimaz17.sentinel.facilities.InviteCodes;
import java.sql.Array;
import java.sql.Timestamp;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The public demonstration's starting state, and the nightly return to it.
 *
 * <p>{@link #restore()} puts the four demo accounts back as {@link DemoAccount} describes them,
 * with the demo password, enabled and with no link outstanding, and gives the demo facility the
 * published invite code. It runs when the API starts and at the end of every reset.
 *
 * <p>{@link #reset()} first undoes what visitors did: it returns every alert to new with no
 * verdict, deletes the accounts visitors made (and their sessions and links), and removes the
 * invite codes the demo administrator issued. Accounts the owner made are never touched. Reports
 * are left alone: they carry no account, by design, so a visitor's report cannot be told from the
 * simulator's, and both are simulated.
 */
@Service
@ConditionalOnBooleanProperty("sentinel.demo.enabled")
public class DemoState {

  private static final Logger log = LoggerFactory.getLogger(DemoState.class);

  private final JdbcTemplate jdbc;
  private final PasswordEncoder passwords;
  private final InviteCodes inviteCodes;
  private final DemoProperties demo;
  private final Clock clock;

  DemoState(
      JdbcTemplate jdbc,
      PasswordEncoder passwords,
      InviteCodes inviteCodes,
      DemoProperties demo,
      Clock clock) {
    this.jdbc = jdbc;
    this.passwords = passwords;
    this.inviteCodes = inviteCodes;
    this.demo = demo;
    this.clock = clock;
  }

  /** Puts the demo accounts and the published invite code back as they start. */
  @Transactional
  public void restore() {
    Long facilityId =
        jdbc.queryForObject(
            "select id from facilities where code = ?", Long.class, DemoAccount.FACILITY_CODE);
    for (DemoAccount account : DemoAccount.values()) {
      restore(account, facilityId);
    }
    long administrator = idOf(DemoAccount.ADMINISTRATOR);
    inviteCodes.issueKnown(DemoAccount.FACILITY_CODE, demo.inviteCode(), administrator);
  }

  /** Returns the demo to its starting state. */
  @Transactional
  public void reset() {
    int alerts =
        jdbc.update(
            """
            update alerts set status = 'NEW', verdict = null, verdict_at = null, verdict_by = null
            where status <> 'NEW' or verdict is not null
            """);
    jdbc.update(
        """
        delete from refresh_tokens
        where account_id in (select id from accounts where made_in_demo)
        """);
    jdbc.update(
        """
        delete from activation_tokens
        where account_id in (select id from accounts where made_in_demo)
        """);
    int accounts = jdbc.update("delete from accounts where made_in_demo");
    int codes =
        jdbc.update(
            "delete from facility_invite_codes where issued_by = ?",
            idOf(DemoAccount.ADMINISTRATOR));
    restore();
    log.info(
        "Reset the demo: {} alerts returned to new, {} visitor accounts and {} invite codes"
            + " removed.",
        alerts,
        accounts,
        codes);
  }

  /**
   * Creates the account if it is missing, and otherwise puts it back: its name, role, reach and
   * password as published, enabled, and never a visitor's. A link issued for it is withdrawn, so
   * nobody holds a way to change its password.
   */
  private void restore(DemoAccount account, Long facilityId) {
    Long facility = account == DemoAccount.DATA_PROVIDER ? facilityId : null;
    jdbc.update(
        connection -> {
          var statement =
              connection.prepareStatement(
                  """
                  insert into accounts (email, display_name, password_hash, role, facility_id,
                    districts, enabled, created_at, made_in_demo)
                  values (?, ?, ?, ?, ?, ?, true, ?, false)
                  on conflict (email) do update set
                    display_name = excluded.display_name,
                    password_hash = excluded.password_hash,
                    role = excluded.role,
                    facility_id = excluded.facility_id,
                    districts = excluded.districts,
                    enabled = true,
                    made_in_demo = false
                  """);
          Array districts =
              connection.createArrayOf("text", account.districts().toArray(String[]::new));
          statement.setString(1, account.email());
          statement.setString(2, account.displayName());
          statement.setString(3, passwords.encode(demo.password()));
          statement.setString(4, account.role().name());
          statement.setObject(5, facility);
          statement.setArray(6, districts);
          statement.setTimestamp(7, Timestamp.from(clock.instant()));
          return statement;
        });
    jdbc.update("delete from activation_tokens where account_id = ?", idOf(account));
  }

  private long idOf(DemoAccount account) {
    return jdbc.queryForObject(
        "select id from accounts where email = ?", Long.class, account.email());
  }
}
