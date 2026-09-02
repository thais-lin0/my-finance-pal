-- ══════════════════════════════════════════════════════════════════
--  Migration: módulo Agenda (planejamento semanal de atividades)
--  Independente do financeiro. Idempotente (seguro rodar mais de uma vez).
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  week_start  date not null,                 -- segunda-feira da semana (YYYY-MM-DD)
  weekday     smallint not null default 0,   -- 0=Seg ... 6=Dom
  title       text not null,                 -- "Academia - perna", "Futebol"
  category    text not null default 'Treino',-- Treino, Academia, Futebol, Corrida, Estudo, Outro
  start_time  time,                          -- horário início (opcional)
  end_time    time,                          -- horário fim (opcional)
  notes       text,
  status      text not null default 'pendente', -- pendente | feito | nao_realizado
  is_recurring boolean not null default false,   -- atividade fixa (repete toda semana)
  created_at  timestamptz not null default now()
);

create index if not exists idx_activities_user_week on public.activities (user_id, week_start);

alter table public.activities enable row level security;

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
