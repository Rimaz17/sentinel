package io.github.rimaz17.sentinel.accounts;

/**
 * What a person may do in Sentinel. The public holds no account and needs none; the other three are
 * staff. How far an inspector reaches is not a role: it is the account's district scope, so
 * district and national inspectors are both {@link #PHI}.
 */
public enum Role {
  /** Anyone, signed in or not: the public dashboard and nothing else. Never stored. */
  PUBLIC,
  /** Staff at a facility, submitting reports on its behalf. */
  DATA_PROVIDER,
  /** A public health inspector, working the internal dashboard within their districts. */
  PHI,
  /** Maintains the facility invite codes and creates inspector accounts. */
  ADMIN
}
