-- One-time activation links. An administrator creates an inspector's account
-- with no password and passes on the link this token makes; following it, the
-- inspector sets their own password. The same link, issued again for an account
-- that already has a password, lets its owner set a new one.
--
-- An account has at most one link outstanding. Issuing another replaces it, and
-- using it deletes it. As with refresh tokens, only a SHA-256 hash is stored.

create table activation_tokens (
    account_id bigint primary key references accounts (id),
    token_hash text not null unique,
    issued_at  timestamptz not null,
    expires_at timestamptz not null,
    constraint activation_tokens_expiry check (expires_at > issued_at)
);
