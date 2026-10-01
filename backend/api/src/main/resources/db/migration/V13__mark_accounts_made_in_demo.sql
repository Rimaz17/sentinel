-- Accounts made by visitors to the public demonstration (docs/adr/0017).
--
-- With demo mode on, anyone may sign in as the demo administrator. The accounts
-- visitors make through the demo are marked here: inspectors the demo
-- administrator creates, and data providers registered with an invite code the
-- demo administrator issued, the demo's published code among them. The nightly
-- reset deletes exactly these rows, so it never touches an account the owner
-- made. Outside demo mode nothing sets the mark.

alter table accounts add column made_in_demo boolean not null default false;
