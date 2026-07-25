-- Guard against duplicate "self" player rows when onAuthStateChange fires
-- more than once in quick succession on load (each firing calls
-- ensureSelfPlayer, which otherwise has a check-then-insert race).
create unique index if not exists players_self_unique_idx
  on players (owner_user_id)
  where linked_user_id = owner_user_id;
