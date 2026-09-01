-- ══════════════════════════════════════════════════════════════════
--  Migration: aba Investimentos + espelho da poupança
--  Rode no SQL Editor se você JÁ tinha o banco criado antes desta feature.
--  Idempotente (seguro rodar mais de uma vez).
-- ══════════════════════════════════════════════════════════════════

-- link da poupança com o aporte espelhado
alter table public.savings
  add column if not exists investment_id uuid;

-- tabela de investimentos (patrimônio acumulado)
create table if not exists public.investments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  kind         text not null default 'CDB',
  amount       numeric(12, 2) not null default 0,
  invested_at  date not null default current_date,
  source       text not null default 'manual',
  created_at   timestamptz not null default now()
);

create index if not exists idx_investments_user on public.investments (user_id, invested_at);

alter table public.investments enable row level security;

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
