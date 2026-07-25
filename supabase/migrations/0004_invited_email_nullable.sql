-- 0002 added invited_user_id and a check constraint allowing either
-- invited_user_id OR invited_email to be set, but never dropped the
-- original NOT NULL on invited_email from 0001 — so a username-based
-- invite (invited_user_id set, invited_email left out) always violated the
-- column constraint before the check constraint was ever consulted.
alter table match_invites alter column invited_email drop not null;
