-- matches_select only grants visibility once an invite is ACCEPTED (see
-- 0002), but the accept/decline modal needs the match's mode and owner
-- *before* the invitee has accepted anything. A plain client-side select
-- with an embedded matches(...)/players(...) resource silently returns
-- null for those embeds under RLS (rather than erroring), which made
-- pending invites disappear entirely instead of surfacing with missing
-- data. A narrow SECURITY DEFINER RPC returns exactly the fields the modal
-- needs for the caller's own pending invites, without widening general
-- match visibility.
create or replace function list_pending_invites()
returns table (
  id uuid,
  match_id uuid,
  mode text,
  owner_user_id uuid,
  player_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select mi.id, mi.match_id, m.mode, m.owner_user_id, p.name
  from match_invites mi
  join matches m on m.id = mi.match_id
  join players p on p.id = mi.player_id
  where mi.status = 'pending'
    and (mi.invited_user_id = auth.uid() or mi.invited_email = (auth.jwt() ->> 'email'));
$$;

grant execute on function list_pending_invites() to authenticated;
