-- ══════════════════════════════════════════════════════════════════
--  Migration: controle de água (módulo Nutrição)
--  Meta diária (water_ml_goal) na mesma linha de nutrition_goals — pode
--  ser definida manualmente ou pela IA em "Gerar metas com IA" (Diário),
--  com base no peso (Medidas) e atividade da semana (Agenda).
--  Registros de consumo em water_logs, um por "adicionei X ml agora".
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

alter table public.nutrition_goals add column if not exists water_ml_goal integer not null default 2000;

create table if not exists public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  log_date   date not null default current_date,
  amount_ml  integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_water_logs_user_date on public.water_logs (user_id, log_date);

alter table public.water_logs enable row level security;

drop policy if exists "water_logs_select_own" on public.water_logs;
create policy "water_logs_select_own" on public.water_logs
  for select using (auth.uid() = user_id);

drop policy if exists "water_logs_insert_own" on public.water_logs;
create policy "water_logs_insert_own" on public.water_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "water_logs_delete_own" on public.water_logs;
create policy "water_logs_delete_own" on public.water_logs
  for delete using (auth.uid() = user_id);
