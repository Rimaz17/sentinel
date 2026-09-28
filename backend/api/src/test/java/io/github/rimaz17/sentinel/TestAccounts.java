package io.github.rimaz17.sentinel;

import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.auth.AccessTokens;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Creates accounts for integration tests and signs requests as them. */
@TestComponent
public class TestAccounts {

  /** The report feed's key in every integration test. */
  public static final String FEED_KEY = "integration-tests-only-feed-key-0123456789";

  public static final String FEED_KEY_HEADER = "X-Feed-Key";

  private final JdbcTemplate jdbc;
  private final PasswordEncoder passwords;
  private final AccountService accounts;
  private final AccessTokens tokens;

  TestAccounts(
      JdbcTemplate jdbc, PasswordEncoder passwords, AccountService accounts, AccessTokens tokens) {
    this.jdbc = jdbc;
    this.passwords = passwords;
    this.accounts = accounts;
    this.tokens = tokens;
  }

  /** Removes every account and everything that refers to one. */
  public void clear() {
    jdbc.update("delete from refresh_tokens");
    jdbc.update("delete from accounts");
  }

  public long admin(String email, String password) {
    return insert(email, password, "ADMIN", null, new String[0]);
  }

  /** An inspector covering the given districts; {@code "*"} for every district. */
  public long inspector(String email, String password, String... districts) {
    return insert(email, password, "PHI", null, districts);
  }

  public long dataProvider(String email, String password, String facilityCode) {
    long facilityId =
        jdbc.queryForObject("select id from facilities where code = ?", Long.class, facilityCode);
    return insert(email, password, "DATA_PROVIDER", facilityId, new String[0]);
  }

  /** An Authorization header value carrying a fresh access token for the account. */
  public String bearer(long accountId) {
    return "Bearer " + tokens.issue(accounts.findById(accountId).orElseThrow()).value();
  }

  private long insert(
      String email, String password, String role, Long facilityId, String[] districts) {
    GeneratedKeyHolder key = new GeneratedKeyHolder();
    jdbc.update(
        connection -> {
          PreparedStatement statement =
              connection.prepareStatement(
                  """
                  insert into accounts (email, display_name, password_hash, role, facility_id,
                    districts, created_at)
                  values (?, ?, ?, ?, ?, ?, ?)
                  """,
                  Statement.RETURN_GENERATED_KEYS);
          statement.setString(1, email);
          statement.setString(2, "Test " + role.toLowerCase());
          statement.setString(3, password == null ? null : passwords.encode(password));
          statement.setString(4, role);
          statement.setObject(5, facilityId);
          statement.setArray(6, connection.createArrayOf("text", districts));
          statement.setTimestamp(7, Timestamp.from(Instant.now()));
          return statement;
        },
        key);
    return ((Number) key.getKeys().get("id")).longValue();
  }
}
