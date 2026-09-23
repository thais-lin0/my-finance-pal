-- ══════════════════════════════════════════════════════════════════
--  Migration 015: tabela profiles (perfil público de cada usuário)
--
--  Por quê: auth.users é gerenciada pelo Supabase e não deve ser lida
--  diretamente pelo app (fica no schema `auth`, protegida). A convenção
--  Supabase é ter uma tabela `public.profiles` espelhando cada usuário,
--  com os dados que o app precisa mostrar (nome, avatar, papel).
--
--  Como popula: um trigger em auth.users cria a linha em profiles
--  automaticamente a cada novo cadastro. Um backfill no fim cria as
--  linhas dos usuários que JÁ existem hoje (você e o novo usuário).
--
--  Idempotente. Não altera dados existentes (o backfill usa ON CONFLICT).
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,                                   -- espelho de auth.users.email (conveniência)
  display_name  text,                                   -- nome de exibição ("Thais")
  avatar_url    text,                                   -- foto (opcional, para depois)
  role          text not null default 'member',         -- member | admin (para gestão futura)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────────
-- Leitura: todo usuário autenticado pode ver o perfil de qualquer um
--   (necessário para mostrar "quem é quem" — ex: nome de quem divide
--   uma despesa). Só expõe nome/avatar/email, nada sensível.
-- Escrita: cada um só edita o PRÓPRIO perfil. O trigger (SECURITY
--   DEFINER) é quem cria a linha no cadastro, então não há política de
--   INSERT para o usuário comum.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── Trigger: cria a profile a cada novo usuário ───────────────────
-- SECURITY DEFINER para conseguir inserir na profiles a partir do
-- schema auth. Lê display_name do metadata do cadastro se existir
-- (supabase.auth.signUp({ options: { data: { display_name } } })),
-- senão cai no trecho antes do @ do email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Backfill: cria as profiles dos usuários que já existem ────────
-- (roda uma vez; ON CONFLICT evita duplicar em reexecuções)
insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    split_part(u.email, '@', 1)
  )
from auth.users u
on conflict (id) do nothing;
