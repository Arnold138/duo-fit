-- Duo Fit — déjà appliqué sur le projet Supabase « Kioku » (même compte de connexion).
-- Une ligne JSON par utilisateur. Ne touche pas aux tables kioku_*.
create table if not exists public.duofit_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.duofit_state enable row level security;
drop policy if exists "duofit_select_own" on public.duofit_state;
drop policy if exists "duofit_insert_own" on public.duofit_state;
drop policy if exists "duofit_update_own" on public.duofit_state;
create policy "duofit_select_own" on public.duofit_state for select using ((select auth.uid()) = user_id);
create policy "duofit_insert_own" on public.duofit_state for insert with check ((select auth.uid()) = user_id);
create policy "duofit_update_own" on public.duofit_state for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- v1.1 : Strava (appliqué sur le projet Kioku)
create table if not exists public.strava_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id bigint unique not null, athlete_name text,
  access_token text not null, refresh_token text not null, expires_at bigint not null,
  created_at timestamptz not null default now()
);
alter table public.strava_links enable row level security;   -- aucune règle : lisible seulement par la fonction serveur
create table if not exists public.strava_oauth_states (
  state text primary key, user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.strava_oauth_states enable row level security;
create table if not exists public.strava_activities (
  user_id uuid not null references auth.users (id) on delete cascade, activity_id bigint not null,
  data jsonb not null, updated_at timestamptz not null default now(), primary key (user_id, activity_id)
);
alter table public.strava_activities enable row level security;
drop policy if exists "strava_act_select_own" on public.strava_activities;
create policy "strava_act_select_own" on public.strava_activities for select using ((select auth.uid()) = user_id);
