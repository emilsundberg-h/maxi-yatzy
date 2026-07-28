-- Dice as a player left them when their last turn ended, so their next
-- turn's dice column starts showing that instead of a fresh
-- [1,1,1,1,1,1] — closer to how a physical game leaves the dice sitting
-- on the table between turns.
alter table match_players add column if not exists last_dice int[];
