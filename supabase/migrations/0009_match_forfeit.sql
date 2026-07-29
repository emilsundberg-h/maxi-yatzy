-- Set when a player swipes a match away to give up rather than playing it
-- out. The match still completes normally (scores as they stood), but the
-- forfeiting player can never be shown as the winner even if their score
-- was highest — the app enforces that in matchWinnerId(), this column
-- just records who quit.
alter table matches add column if not exists forfeited_by_player_id uuid
  references players(id) on delete set null;
