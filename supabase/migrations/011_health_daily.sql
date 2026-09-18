-- ══════════════════════════════════════════════════════════════════
--  Migration: dados de saúde diários (entrada MANUAL)
--
--  Uma linha por usuário por dia (upsert por user_id + log_date).
--  Preenchida à mão no app: total de passos do dia (steps) e a meta de
--  passos (steps_goal). As CALORIAS GASTAS não ficam aqui — são somadas
--  das atividades concluídas na Agenda (activities.calories_burned), então
--  não há campo de calorias nesta tabela.
--
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.health_daily (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  log_date   date not null default current_date,
  steps      integer,
  steps_goal integer not null default 8000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists idx_health_daily_user_date on public.health_daily (user_id, log_date);

alter table public.health_daily enable row level security;

drop policy if exists "health_daily_select_own" on public.health_daily;
create policy "health_daily_select_own" on public.health_daily
  for select using (auth.uid() = user_id);

drop policy if exists "health_daily_insert_own" on public.health_daily;
create policy "health_daily_insert_own" on public.health_daily
  for insert with check (auth.uid() = user_id);

drop policy if exists "health_daily_update_own" on public.health_daily;
create policy "health_daily_update_own" on public.health_daily
  for update using (auth.uid() = user_id);

drop policy if exists "health_daily_delete_own" on public.health_daily;
create policy "health_daily_delete_own" on public.health_daily
  for delete using (auth.uid() = user_id);

-- Remove a RPC do fluxo antigo do Apple Watch, se existir.
drop function if exists public.upsert_health_daily(date, integer, integer, integer, integer, integer);
