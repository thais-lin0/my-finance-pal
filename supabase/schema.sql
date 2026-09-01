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
  ref_month    date not null,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  Índices para consulta por usuário + mês
-- ─────────────────────────────────────────────
create index if not exists idx_incomes_user_month  on public.incomes  (user_id, ref_month);
create index if not exists idx_expenses_user_month  on public.expenses (user_id, ref_month);
create index if not exists idx_savings_user_month   on public.savings  (user_id, ref_month);

-- ══════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--  Cada usuário só enxerga e altera os PRÓPRIOS registros.
-- ══════════════════════════════════════════════════════════════════
alter table public.incomes  enable row level security;
alter table public.expenses enable row level security;
alter table public.savings  enable row level security;

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
  for select using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own" on public.expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own" on public.expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
