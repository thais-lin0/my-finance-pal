-- ══════════════════════════════════════════════════════════════════
--  Migration: metas de peso/medidas com data-alvo (módulo Nutrição)
--  Uma linha por usuário (upsert). Idempotente.
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.body_goals (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  target_weight  numeric(6,2),
  target_fat_pct numeric(5,2),
  target_waist   numeric(6,2),
  target_date    date,
  updated_at     timestamptz not null default now()
);

alter table public.body_goals enable row level security;

drop policy if exists "body_goals_select_own" on public.body_goals;
create policy "body_goals_select_own" on public.body_goals
  for select using (auth.uid() = user_id);

drop policy if exists "body_goals_insert_own" on public.body_goals;
create policy "body_goals_insert_own" on public.body_goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "body_goals_update_own" on public.body_goals;
create policy "body_goals_update_own" on public.body_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "body_goals_delete_own" on public.body_goals;
create policy "body_goals_delete_own" on public.body_goals
  for delete using (auth.uid() = user_id);
