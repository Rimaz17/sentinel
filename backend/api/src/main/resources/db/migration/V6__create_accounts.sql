-- Staff accounts. The public has none: the public dashboard needs no sign-in.
--
-- Role is one of three values, and an inspector's reach is data rather than a
-- role of its own: a PHI account lists the districts it covers, and '*' means
-- every district. A PHI account must list at least one entry, so a missing
-- scope can never be mistaken for national reach.
--
-- A data provider belongs to exactly one facility, fixed when the account is
-- created from that facility's invite code; no other role has a facility.
--
-- The password hash is BCrypt. It is null for an inspector who has been
-- created by an administrator but has not yet followed their activation link,
-- and such an account cannot sign in. Email is stored lower case, so one
-- address cannot hold two accounts by varying its capitals.

create table accounts (
    id            bigint generated always as identity primary key,
    email         text not null unique,
    display_name  text not null,
    password_hash text,
    role          text not null,
    facility_id   bigint references facilities (id),
    districts     text[] not null default '{}',
    enabled       boolean not null default true,
    created_at    timestamptz not null,
    constraint accounts_email_lower check (email = lower(email)),
    constraint accounts_role check (role in ('DATA_PROVIDER', 'PHI', 'ADMIN')),
    constraint accounts_facility check ((role = 'DATA_PROVIDER') = (facility_id is not null)),
    constraint accounts_scope check (
        case when role = 'PHI' then cardinality(districts) > 0 else cardinality(districts) = 0 end
    )
);

create index accounts_facility_id_idx on accounts (facility_id);
