-- Dice as they stood when the last turn (anyone's) ended, so the next
-- turn starts showing that instead of a fresh [1,1,1,1,1,1]. This
-- replaces match_players.last_dice (0007): the earlier version tracked
-- dice per player, but physical dice are one shared set on the table —
-- whoever's turn it is picks up however the last player left them, not
-- their own dice from turns ago.
alter table matches add column if not exists last_dice int[];
alter table match_players drop column if exists last_dice;
