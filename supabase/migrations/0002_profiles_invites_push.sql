-- Profiles (username + avatar), richer match invites (direct user + status),
-- push subscriptions, and a public avatars bucket.

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy profiles_select_all on profiles for select using (true);
create policy profiles_insert_own on profiles for insert with check (user_id = auth.uid());
create policy profiles_update_own on profiles for update using (user_id = auth.uid());

alter table match_invites
  add column if not exists invited_user_id uuid references auth.users(id),
  add column if not exists status text not null default 'pending' check (status in ('pending','accepted','declined'));

alter table match_invites drop constraint if exists match_invites_target_check;
alter table match_invites add constraint match_invites_target_check
  check (invited_user_id is not null or invited_email is not null);

-- Existing rows (from before this migration) were email-only invites implicitly
-- granting match access. Treat them as already-accepted so nothing that worked
-- before this migration silently loses access.
update match_invites set status = 'accepted' where status = 'pending';

-- matches_select / matches_update now require an ACCEPTED invite, matched by
-- user id OR email (still inlined, not via is_match_participant() — see the
-- comment in 0001_init.sql on why a self-referential call there breaks
-- INSERT ... RETURNING).
drop policy if exists matches_select on matches;
create policy matches_select on matches for select
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1 from match_invites mi
      where mi.match_id = matches.id
        and mi.status = 'accepted'
        and (mi.invited_user_id = auth.uid() or mi.invited_email = (auth.jwt() ->> 'email'))
    )
  );

drop policy if exists matches_update on matches;
create policy matches_update on matches for update
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1 from match_invites mi
      where mi.match_id = matches.id
        and mi.status = 'accepted'
        and (mi.invited_user_id = auth.uid() or mi.invited_email = (auth.jwt() ->> 'email'))
    )
  );

-- is_match_participant() is called from match_players/activity/match_invites
-- policies against `matches` (a different relation than the one being
-- protected in each case), so the self-reference bug doesn't apply there —
-- just update it to also require acceptance.
create or replace function is_match_participant(p_match_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from matches m
    where m.id = p_match_id
      and (
        m.owner_user_id = auth.uid()
        or exists (
          select 1 from match_invites mi
          where mi.match_id = m.id
            and mi.status = 'accepted'
            and (mi.invited_user_id = auth.uid() or mi.invited_email = (auth.jwt() ->> 'email'))
        )
      )
  );
$$;

-- The invited person needs to see their own PENDING invites too (to act on
-- them), not just accepted ones visible via is_match_participant.
drop policy if exists match_invites_select on match_invites;
create policy match_invites_select on match_invites for select
  using (
    is_match_participant(match_id)
    or invited_user_id = auth.uid()
    or invited_email = (auth.jwt() ->> 'email')
  );

-- Status changes only happen through the RPCs below (validated, atomic —
-- accepting also claims the player identity in the same transaction), not
-- through an open UPDATE policy.
drop policy if exists match_invites_update on match_invites;

create or replace function accept_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  select player_id into v_player_id
  from match_invites
  where id = p_invite_id
    and status = 'pending'
    and (invited_user_id = auth.uid() or invited_email = (auth.jwt() ->> 'email'));

  if v_player_id is null then
    raise exception 'Invite not found or not yours';
  end if;

  update match_invites
  set status = 'accepted', invited_user_id = auth.uid()
  where id = p_invite_id;

  update players set linked_user_id = auth.uid() where id = v_player_id;
end;
$$;

create or replace function decline_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update match_invites
  set status = 'declined'
  where id = p_invite_id
    and status = 'pending'
    and (invited_user_id = auth.uid() or invited_email = (auth.jwt() ->> 'email'));
end;
$$;

grant execute on function accept_invite(uuid) to authenticated;
grant execute on function decline_invite(uuid) to authenticated;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
create policy push_subscriptions_own on push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

alter publication supabase_realtime add table match_invites;
