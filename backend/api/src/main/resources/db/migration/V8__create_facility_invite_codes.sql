-- Facility invite codes: the only way a data provider account can be created.
--
-- Each facility has at most one code, issued by an administrator and delivered
-- to the facility directly. Anyone at the facility registers with it, so it is
-- shared, one per facility rather than one per person; that trade-off is
-- documented in the README's known limitations.
--
-- The code itself is shown to the administrator once, when it is issued, and
-- only its SHA-256 hash is kept. Issuing again replaces the code: the old one
-- stops working for new registrations, and accounts already created with it
-- are untouched. Revoking deletes the row.

create table facility_invite_codes (
    facility_id bigint primary key references facilities (id),
    code_hash   text not null unique,
    issued_at   timestamptz not null,
    issued_by   bigint not null references accounts (id)
);
