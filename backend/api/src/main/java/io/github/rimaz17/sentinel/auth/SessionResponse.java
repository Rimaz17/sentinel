package io.github.rimaz17.sentinel.auth;

import java.time.Instant;

/**
 * A started or renewed session. The access token is for the browser's memory only; the refresh
 * token is never in a response body, only in its HttpOnly cookie, where scripts cannot read it.
 */
record SessionResponse(String accessToken, Instant accessTokenExpiresAt, AccountResponse account) {}
