-- Guest players (added by name, no account of their own) can't have a
-- profiles.avatar_url — that table is keyed by auth.users.id. Store an
-- optional avatar directly on the player row instead, so any player (guest
-- or linked account) can have a photo. players_update already lets the
-- owner set this (owner_user_id = auth.uid()).
alter table players add column if not exists avatar_url text;
