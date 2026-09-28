-- Refresh tokens: what keeps a signed-in person signed in once their
-- fifteen-minute access token has expired.
--
-- Only a SHA-256 hash of each token is stored. The token itself lives in the
-- browser's HttpOnly cookie, so a copy of this table cannot be used to sign in.
--
-- Every use replaces the token with a new one (rotation). A replaced token is
-- kept, marked revoked, until it expires: if it is ever presented again, well
-- after it was replaced, someone other than its owner has a copy, and every
-- token the account holds is revoked.

create table refresh_tokens (
    id             bigint generated always as identity primary key,
    account_id     bigint not null references accounts (id),
    token_hash     text not null unique,
    issued_at      timestamptz not null,
    expires_at     timestamptz not null,
    revoked_at     timestamptz,
    revoked_reason text,
    constraint refresh_tokens_expiry check (expires_at > issued_at),
    constraint refresh_tokens_revocation check ((revoked_at is null) = (revoked_reason is null)),
    constraint refresh_tokens_reason check (
        revoked_reason in ('ROTATED', 'SIGNED_OUT', 'REUSED', 'ACCOUNT_CHANGED')
    )
);

create index refresh_tokens_account_id_idx on refresh_tokens (account_id);
