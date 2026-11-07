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
