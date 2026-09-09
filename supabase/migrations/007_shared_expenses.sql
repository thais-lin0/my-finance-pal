-- ══════════════════════════════════════════════════════════════════
--  Migration: despesas compartilhadas entre dois usuários (opção B)
--  Uma única linha de despesa; o participante vê e edita via RLS.
--  Cada lado conta apenas a sua fração nos totais.
--  Idempotente.
-- ══════════════════════════════════════════════════════════════════

-- quem divide a despesa (null = despesa individual) e a % do dono
alter table public.expenses
  add column if not exists shared_with uuid references auth.users (id) on delete set null;
alter table public.expenses
  add column if not exists owner_share integer not null default 50; -- % que cabe ao criador (user_id)

create index if not exists idx_expenses_shared_with on public.expenses (shared_with);

-- ── RLS: dono OU participante podem ver e editar ──────────────────
-- (substitui as políticas antigas que eram só do dono)
drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own" on public.expenses
  for select using (auth.uid() = user_id or auth.uid() = shared_with);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own" on public.expenses
  for update using (auth.uid() = user_id or auth.uid() = shared_with)
  with check (auth.uid() = user_id or auth.uid() = shared_with);

-- inserir: continua só o dono cria a linha (user_id = você)
drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own" on public.expenses
  for insert with check (auth.uid() = user_id);

-- excluir: apenas o dono exclui a despesa compartilhada
drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own" on public.expenses
  for delete using (auth.uid() = user_id);

-- ── Helper: achar user_id por email (para o convite) ──────────────
-- SECURITY DEFINER para conseguir ler auth.users; só retorna o id, nada sensível.
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
