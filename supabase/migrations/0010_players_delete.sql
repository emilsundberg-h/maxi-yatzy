-- players never got a DELETE policy (0001_init.sql only granted
-- select/insert/update), so self-service cleanup of duplicate/guest player
-- rows silently 403s. Same owner-only check matches_delete already uses.
create policy players_delete on players for delete
  using (owner_user_id = auth.uid());
