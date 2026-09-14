-- ══════════════════════════════════════════════════════════════════
--  Migration: perfil alimentar (anamnese) — preferências, restrições e
--  gostos do usuário, usados pra montar o prompt dos recursos de IA da
--  Nutrição (cardápio, análise de refeição, lista de compras, coach).
--  Uma linha por usuário (upsert). Idempotente.
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.dietary_profile (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  diet_style          text,   -- sem_restricao | vegetariano | vegano | low_carb | cetogenica | outro
  restrictions         text,   -- alergias/intolerâncias em texto livre
  dislikes            text,   -- alimentos que não gosta / evita
  preferred_carbs     text,   -- carboidratos preferidos
  preferred_proteins  text,   -- proteínas preferidas
  preferred_breakfast text,   -- café da manhã de preferência
  variety_level       text,   -- bem_simples | equilibrado | variado
  notes               text,   -- observações livres
  updated_at          timestamptz not null default now()
);

alter table public.dietary_profile enable row level security;

drop policy if exists "dietary_profile_select_own" on public.dietary_profile;
create policy "dietary_profile_select_own" on public.dietary_profile
  for select using (auth.uid() = user_id);

drop policy if exists "dietary_profile_insert_own" on public.dietary_profile;
create policy "dietary_profile_insert_own" on public.dietary_profile
  for insert with check (auth.uid() = user_id);

drop policy if exists "dietary_profile_update_own" on public.dietary_profile;
create policy "dietary_profile_update_own" on public.dietary_profile
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "dietary_profile_delete_own" on public.dietary_profile;
create policy "dietary_profile_delete_own" on public.dietary_profile
  for delete using (auth.uid() = user_id);
