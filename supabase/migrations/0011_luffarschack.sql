-- Adds Luffarschack as a second game type alongside Maxi Yatzy.
--
-- `game` discriminates which game a match is playing; existing rows default
-- to 'maxi_yatzy' so no backfill script is needed. `winner_player_id` records
-- an explicit winner for games that aren't decided by comparing
-- match_players.scores (Luffarschack: whoever got 5-in-a-row, or the
-- opponent of whoever forfeited — see matches.forfeited_by_player_id).
--
-- No RLS changes: matches' policies already key off owner_user_id /
-- match_invites, not any particular column. match_players and activity need
-- no schema change — match_players rows are already created (empty
-- scores/pool) for every match regardless of game, and activity.payload is
-- already schemaless jsonb, so Luffarschack's "mark_placed" events need
-- nothing new there either.
alter table matches add column if not exists game text not null default 'maxi_yatzy'
  check (game in ('maxi_yatzy', 'luffarschack'));

alter table matches add column if not exists winner_player_id uuid
  references players(id) on delete set null;
