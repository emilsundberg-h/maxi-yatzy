-- Maxi Yatzy — initial schema, RLS, and realtime setup.
-- Mirrors lib/domain/types.ts (Player, Match, MatchPlayer, ActivityEvent) plus
-- match_invites for email-based cross-device invites.

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('shared-device', 'separate-devices')),
  status text not null check (status in ('in_progress', 'completed')) default 'in_progress',
  player_ids uuid[] not null,
  current_player_index int not null default 0,
  current_turn_number int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists match_players (
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  pool int not null default 0,
  primary key (match_id, player_id)
);

create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  turn_number int not null,
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_match_id_created_at_idx on activity (match_id, created_at);

create table if not exists match_invites (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  invited_email text not null,
  created_at timestamptz not null default now()
);
create index if not exists match_invites_email_idx on match_invites (invited_email);

-- Security-definer helper: is the current user the match owner, or invited to
-- it by email? SECURITY DEFINER + fixed search_path avoids RLS recursion
-- (this function is itself called from a policy ON matches).
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
            and mi.invited_email = (auth.jwt() ->> 'email')
        )
      )
  );
$$;

alter table players enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table activity enable row level security;
alter table match_invites enable row level security;

create policy players_select on players for select
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1 from match_players mp
      where mp.player_id = players.id and is_match_participant(mp.match_id)
    )
  );
create policy players_insert on players for insert
  with check (owner_user_id = auth.uid());
create policy players_update on players for update
  using (owner_user_id = auth.uid());

-- Inlined rather than calling is_match_participant(id): a SECURITY DEFINER
-- function that queries `matches` from within a policy ON `matches` breaks
-- row visibility specifically for INSERT ... RETURNING (PostgREST always
-- requests RETURNING on insert/update) — confirmed by direct testing, the
-- same self-referential check works fine as a plain SELECT but makes
-- INSERT ... RETURNING report "new row violates row-level security policy"
-- even for the row's own owner. Inlining avoids the self-reference; other
-- tables' policies call is_match_participant() against `matches` (a
-- different relation than the one being protected) without issue.
create policy matches_select on matches for select
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1 from match_invites mi
      where mi.match_id = matches.id and mi.invited_email = (auth.jwt() ->> 'email')
    )
  );
create policy matches_insert on matches for insert
  with check (owner_user_id = auth.uid());
create policy matches_update on matches for update
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1 from match_invites mi
      where mi.match_id = matches.id and mi.invited_email = (auth.jwt() ->> 'email')
    )
  );
create policy matches_delete on matches for delete
  using (owner_user_id = auth.uid());

create policy match_players_select on match_players for select
  using (is_match_participant(match_id));
create policy match_players_insert on match_players for insert
  with check (is_match_participant(match_id));
create policy match_players_update on match_players for update
  using (is_match_participant(match_id));

create policy activity_select on activity for select
  using (is_match_participant(match_id));
create policy activity_insert on activity for insert
  with check (is_match_participant(match_id));

create policy match_invites_select on match_invites for select
  using (is_match_participant(match_id));
create policy match_invites_insert on match_invites for insert
  with check (
    exists (select 1 from matches m where m.id = match_id and m.owner_user_id = auth.uid())
  );

-- Realtime: stream changes so the app can replace polling with live updates.
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table match_players;
alter publication supabase_realtime add table activity;
