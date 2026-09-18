-- ══════════════════════════════════════════════════════════════════
--  My Finance Pal — Schema Supabase
--  Cole tudo no Supabase Dashboard → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- Extensão para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
--  RECEITAS (Monthly Income)
-- ─────────────────────────────────────────────
create table if not exists public.incomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  description  text not null,                 -- "Salário", "Comissão"...
  amount       numeric(12, 2) not null default 0,
  is_recurring boolean not null default false,-- item fixo, aparece todo mês via "Trazer fixos"
  ref_month    date not null,                 -- primeiro dia do mês de referência (YYYY-MM-01)
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  DESPESAS (Monthly Expenses)
-- ─────────────────────────────────────────────
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  description  text not null,                 -- "Gasolina", "Cartão Black"...
  category     text not null default 'Outros',-- "Carro", "Cartão de crédito", "Casa"...
  amount       numeric(12, 2) not null default 0,
  due_date     date,                          -- vencimento
  is_paid      boolean not null default false,
  notes        text,
  is_recurring boolean not null default false,
  shared_with  uuid references auth.users (id) on delete set null, -- participante da despesa dividida
  owner_share  integer not null default 50,   -- % que cabe ao criador (user_id)
  ref_month    date not null,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  POUPANÇA (Monthly Savings)
-- ─────────────────────────────────────────────
create table if not exists public.savings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null default 'Daily', -- tipo de poupança
  amount       numeric(12, 2) not null default 0,
  investment_id uuid,                          -- link para o aporte espelhado em investments
  ref_month    date not null,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  INVESTIMENTOS (patrimônio acumulado, não por mês)
-- ─────────────────────────────────────────────
create table if not exists public.investments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,                  -- "CDB Banco Inter", "Tesouro Selic"...
  kind         text not null default 'CDB',    -- CDB, Tesouro, Ações, FII, Poupança, Outros
  amount       numeric(12, 2) not null default 0,
  invested_at  date not null default current_date, -- data do aporte
  source       text not null default 'manual', -- 'manual' | 'savings' (espelho da poupança)
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  AGENDA (planejamento semanal de atividades — módulo Vida)
-- ─────────────────────────────────────────────
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  week_start  date not null,                 -- segunda-feira da semana
  weekday     smallint not null default 0,   -- 0=Seg ... 6=Dom
  title       text not null,
  category    text not null default 'Treino',
  start_time  time,
  end_time    time,
  notes       text,
  status      text not null default 'pendente', -- pendente | feito | nao_realizado
  is_recurring boolean not null default false,   -- atividade fixa (repete toda semana)
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  Índices para consulta por usuário + mês
-- ─────────────────────────────────────────────
create index if not exists idx_incomes_user_month  on public.incomes  (user_id, ref_month);
create index if not exists idx_expenses_user_month  on public.expenses (user_id, ref_month);
create index if not exists idx_savings_user_month   on public.savings  (user_id, ref_month);
create index if not exists idx_investments_user      on public.investments (user_id, invested_at);
create index if not exists idx_activities_user_week  on public.activities (user_id, week_start);

-- ══════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--  Cada usuário só enxerga e altera os PRÓPRIOS registros.
-- ══════════════════════════════════════════════════════════════════
alter table public.incomes  enable row level security;
alter table public.expenses enable row level security;
alter table public.savings  enable row level security;
alter table public.investments enable row level security;
alter table public.activities enable row level security;

-- INCOMES
drop policy if exists "incomes_select_own" on public.incomes;
create policy "incomes_select_own" on public.incomes
  for select using (auth.uid() = user_id);

drop policy if exists "incomes_insert_own" on public.incomes;
create policy "incomes_insert_own" on public.incomes
  for insert with check (auth.uid() = user_id);

drop policy if exists "incomes_update_own" on public.incomes;
create policy "incomes_update_own" on public.incomes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "incomes_delete_own" on public.incomes;
create policy "incomes_delete_own" on public.incomes
  for delete using (auth.uid() = user_id);

-- EXPENSES
drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own" on public.expenses
  for select using (auth.uid() = user_id or auth.uid() = shared_with);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own" on public.expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own" on public.expenses
  for update using (auth.uid() = user_id or auth.uid() = shared_with)
  with check (auth.uid() = user_id or auth.uid() = shared_with);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own" on public.expenses
  for delete using (auth.uid() = user_id);

-- SAVINGS
drop policy if exists "savings_select_own" on public.savings;
create policy "savings_select_own" on public.savings
  for select using (auth.uid() = user_id);

drop policy if exists "savings_insert_own" on public.savings;
create policy "savings_insert_own" on public.savings
  for insert with check (auth.uid() = user_id);

drop policy if exists "savings_update_own" on public.savings;
create policy "savings_update_own" on public.savings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "savings_delete_own" on public.savings;
create policy "savings_delete_own" on public.savings
  for delete using (auth.uid() = user_id);

-- INVESTMENTS
drop policy if exists "investments_select_own" on public.investments;
create policy "investments_select_own" on public.investments
  for select using (auth.uid() = user_id);

drop policy if exists "investments_insert_own" on public.investments;
create policy "investments_insert_own" on public.investments
  for insert with check (auth.uid() = user_id);

drop policy if exists "investments_update_own" on public.investments;
create policy "investments_update_own" on public.investments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "investments_delete_own" on public.investments;
create policy "investments_delete_own" on public.investments
  for delete using (auth.uid() = user_id);

-- ACTIVITIES
drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own" on public.activities
  for select using (auth.uid() = user_id);

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own" on public.activities
  for insert with check (auth.uid() = user_id);

drop policy if exists "activities_update_own" on public.activities;
create policy "activities_update_own" on public.activities
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "activities_delete_own" on public.activities;
create policy "activities_delete_own" on public.activities
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
--  Helper: achar user_id por email (para o convite de despesa compartilhada)
-- ─────────────────────────────────────────────
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;

-- ─────────────────────────────────────────────
--  Saúde diária (entrada manual) — ver migrations 011 e 012
--  Passos manuais aqui; calorias gastas vêm de activities.calories_burned.
-- ─────────────────────────────────────────────
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

-- calorias gastas por atividade concluída na Agenda
alter table public.activities
  add column if not exists calories_burned integer;
